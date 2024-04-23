import {
	RenderContext,
	UICell,
	UIColumn,
	UIContainer,
	UILabel,
	UIRow,
	UISeparator,
	UISpacer,
	UIStyle,
	UITheme,
	UIVariant,
	ViewComposite,
	ViewEvent,
	app,
	ui,
} from "@desk-framework/frame-core";
import { reduceElementMotion } from "../renderer/WebOutputTransform.js";

/** @internal Fixed container position, used for each menu container */
const _containerPosition = {
	gravity: "overlay",
	top: "100%",
	bottom: "auto",
	start: 0,
} as const;

/**
 * A class that defines the styles for the default modal menu view
 * - A default instance of this class is created, and can be modified in the {@link WebContextOptions} configuration callback passed to {@link useWebContext}.
 * - These styles are used by the default menu view referenced by the {@link UITheme} implementation — and therefore also by {@link GlobalContext.showModalMenuAsync app.showModalMenuAsync()}.
 *
 * @see {@link WebContextOptions}
 * @see {@link UITheme.ModalControllerFactory}
 */
export class ModalMenuStyles {
	/**
	 * The cell variant used for the outer menu container
	 * - The default style includes properties for padding, background, and border radius. A drop shadow effect is also applied to the container.
	 */
	containerVariant = new UIVariant(UICell, {
		accessibleRole: "menu",
		effect: ui.effect.ELEVATE,
		style: ui.style.CELL_BG.extend({
			padding: { y: 8 },
			borderRadius: 12,
			grow: 0,
		}),
	});

	/** The default width that's used if none is specified in menu options */
	defaultWidth = 260;

	/**
	 * The cell variant used for each menu item
	 * - The default style includes properties for padding, cursor, and (hover/focus) background color
	 */
	itemCellVariant = new UIVariant(UICell, {
		accessibleRole: "menuitem",
		style: ui.style.CELL.extend(
			{
				padding: { x: 16 },
				css: { cursor: "pointer" },
			},
			{
				[UIStyle.STATE_HOVERED]: true,
				background: ui.color.PRIMARY_BG,
				textColor: ui.color.PRIMARY_BG.text(),
			},
			{
				[UIStyle.STATE_FOCUSED]: true,
				background: ui.color.PRIMARY_BG,
				textColor: ui.color.PRIMARY_BG.text(),
			},
		),
	});

	/**
	 * The label style used for each menu item label
	 * - This property defaults to the default label style.
	 */
	labelStyle = ui.style.LABEL;

	/**
	 * The label style used for each menu item hint
	 * - The default style includes a smaller font size and reduced opacity
	 */
	hintStyle = ui.style.LABEL.extend({
		opacity: 0.5,
		fontSize: 12,
		shrink: 0,
	});
}

/** @internal Default modal menu view; shown asynchronously and resolves a promise */
export class ModalMenu extends ViewComposite implements UITheme.MenuController {
	static styles = new ModalMenuStyles();

	constructor(public options: UITheme.MenuOptions) {
		super();
	}

	async showAsync(place?: Partial<RenderContext.PlacementOptions>) {
		// return a promise that's resolved when one of the items is selected
		// or when the menu is dismissed otherwise
		return new Promise<{ key: string } | undefined>((r) => {
			app.render(this, {
				mode: "modal",
				transform: {
					show: ui.animation.SHOW_MENU,
					hide: ui.animation.HIDE_MENU,
				},
				...place,
			});
			this._resolve = (key) => {
				this.unlink();
				r(key ? { key } : undefined);
			};
		});
	}

	override createView() {
		// create modal container and items column
		let column = new UIColumn();
		let Outer = ui.cell({
			variant: ModalMenu.styles.containerVariant,
			position: _containerPosition,
		});
		let container = new Outer(column);
		column.width = this.options.width || ModalMenu.styles.defaultWidth;

		// reposition the menu after rendering
		container.listen((e) => {
			if (e.name === "Rendered") this._fixPosition();
		});

		// add menu items with label and/or hint
		const MenuItemCell = ui.cell({
			variant: ModalMenu.styles.itemCellVariant,
			allowFocus: true,
			allowKeyboardFocus: true,
		});
		for (let item of this.options.items) {
			if (item.separate) {
				// add a separator
				column.content.add(new UISeparator());
				continue;
			}

			// add a menu item as a (row) cell
			let itemRow = new UIRow();
			let itemCell = new MenuItemCell(itemRow);
			column.content.add(itemCell);
			let itemLabel = new UILabel(item.text);
			itemRow.content.add(itemLabel);
			if (item.icon) itemLabel.icon = item.icon;
			itemLabel.style = item.labelStyle
				? ModalMenu.styles.labelStyle.override(item.labelStyle)
				: ModalMenu.styles.labelStyle;
			if (item.hint || item.hintIcon) {
				let hintLabel = new UILabel(item.hint);
				if (item.hintIcon) hintLabel.icon = item.hintIcon;
				hintLabel.style = item.hintStyle
					? ModalMenu.styles.hintStyle.override(item.hintStyle)
					: ModalMenu.styles.hintStyle;
				let spacer = new UISpacer();
				spacer.minWidth = 8;
				itemRow.content.add(spacer, hintLabel);
			}

			// add a listener to register clicks and keyboard input
			itemCell.listen((e) => {
				if (e.name === "Click") this._resolve?.(item.key);
				else if (e.name === "EnterKeyPress") this._resolve?.(item.key);
				else if (e.name === "ArrowDownKeyPress") itemCell.requestFocusNext();
				else if (e.name === "ArrowUpKeyPress") itemCell.requestFocusPrevious();
			});
		}
		return container;
	}

	onArrowDownKeyPress(e: ViewEvent) {
		if (e.source !== this.body) return;
		let content = this.body && (this.body as UICell).content;
		if (content) {
			for (let item of content) {
				if (item instanceof UIContainer) {
					item.requestFocus();
					return;
				}
			}
		}
	}

	onArrowUpKeyPress(e: ViewEvent) {
		if (e.source !== this.body) return;
		let content = this.body && (this.body as UICell).content;
		if (content) {
			let lastItem = content.last();
			if (lastItem instanceof UIContainer) {
				lastItem.requestFocus();
			}
		}
	}

	onEscapeKeyPress() {
		this._resolve?.();
	}

	onCloseModal() {
		this._resolve?.();
	}

	private _fixPosition() {
		let container = this.body as UICell;

		// make sure the menu appears within the screen bounds,
		// even if the modal wrapper bounds are at the bottom or
		// on the opposite side (place menu above, or align right/left in LTR/RTL)
		let elt = container.lastRenderOutput?.element as HTMLElement;
		let modalWrapper = elt.parentElement!;
		let modalShader = modalWrapper.parentElement!;
		modalShader.style.overflow = "hidden";
		let bounds = modalWrapper.getBoundingClientRect();
		let isLow: boolean | undefined;
		let isRhs: boolean | undefined;
		let isLhs: boolean | undefined;
		if (bounds && bounds.height) {
			if (bounds.bottom > window.innerHeight * 0.75) isLow = true;
			if (bounds.left > window.innerWidth - 300) isRhs = true;
			if (bounds.right < 300) isLhs = true;
		}

		// fix position for menu to appear above the reference elt,
		// or to appear right-aligned
		if (isLow) {
			elt.style.top = "auto";
			elt.style.bottom = "100%";

			// (try to) stop animation, since element is now at the top
			elt.style.transition = "";
			reduceElementMotion(elt);
		}
		if (isLhs) {
			elt.style.left = "0";
			elt.style.right = "auto";
		} else if (isRhs) {
			elt.style.left = "auto";
			elt.style.right = "0";
		}

		// after rendering the menu, check that it fits on the screen
		// (vertically), and move it up if needed
		if (!isLow) {
			let fixedVert = 0;
			function checkFit() {
				let menuBounds = elt.getBoundingClientRect();
				if (!fixedVert && menuBounds && menuBounds.height) {
					let roomBelow = window.innerHeight - menuBounds.bottom;
					if (roomBelow < fixedVert) {
						fixedVert = roomBelow;
						elt.style.top = roomBelow + bounds.height - 4 + "px";
					}
				}
			}
			setTimeout(checkFit, 250);
		}
	}

	private _resolve?: (key?: string) => void;
}
