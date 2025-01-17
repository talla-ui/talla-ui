import {
	ConfigOptions,
	ModalMenuOptions,
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
	ViewComposite,
	ViewEvent,
	app,
	ui,
} from "@talla-ui/core";
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
 * - These styles are used by the default menu view referenced by the {@link UITheme} implementation — and therefore also by {@link AppContext.showModalMenuAsync app.showModalMenuAsync()}.
 *
 * @see {@link WebContextOptions}
 * @see {@link UITheme.ModalControllerFactory}
 */
export class WebModalMenuStyles extends ConfigOptions {
	/** The effect that's applied to the container, defaults to `Elevate` */
	effect = ui.effect.ELEVATE;

	/** The default width that's used if none is specified in menu options */
	defaultWidth = 260;

	/** The vertical distance from the reference element, in pixels; defaults to 2 */
	offset = 2;

	/**
	 * The cell style used for the outer menu container
	 * - The default style includes properties for padding, background, and border radius.
	 */
	containerStyle: UICell.StyleValue = ui.style.CELL_BG.extend({
		padding: { y: 8 },
		borderRadius: 8,
		grow: 0,
	});

	/**
	 * The cell style used for each menu item
	 * - The default style includes properties for padding, cursor, and (hover/focus) background color
	 */
	itemCellStyle: UICell.StyleValue = ui.style.CELL.extend(
		{
			padding: { x: 16, y: 6 },
			css: { cursor: "pointer", outlineOffset: "-2px" },
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
	);

	/**
	 * The label style used for each menu item label
	 * - This property defaults to the default label style.
	 */
	labelStyle: UILabel.StyleValue = ui.style.LABEL;

	/**
	 * The label style used for each menu item hint
	 * - The default style includes a smaller font size and reduced opacity
	 */
	hintStyle: UILabel.StyleValue = ui.style.LABEL.extend({
		opacity: 0.5,
		fontSize: 12,
		shrink: 0,
	});
}

/** @internal Default modal menu view; shown asynchronously and resolves a promise */
export class ModalMenu extends ViewComposite implements UITheme.MenuController {
	static styles = new WebModalMenuStyles();

	constructor(public options: ModalMenuOptions) {
		super();
	}

	async showAsync(place?: Partial<RenderContext.PlacementOptions>) {
		// TODO(refactor): together with TestModalMenu this is
		// a good candidate for refactoring. Refer to modal dialog
		// implementation for a loop based approach. Would just
		// need to find a way to associate an event with a menu item.

		// return a promise that's resolved when one of the items is selected
		// or when the menu is dismissed otherwise
		return new Promise<{ key: string } | undefined>((r) => {
			app.render(this, {
				mode: "modal",
				transform: {
					show: ui.animation.SHOW_MENU,
					hide: ui.animation.HIDE_MENU,
				},
				refOffset: [0, ModalMenu.styles.offset],
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
		let container = new UICell(column);
		container.accessibleRole = "menu";
		container.effect = ModalMenu.styles.effect;
		container.style = ModalMenu.styles.containerStyle;
		container.position = _containerPosition;
		column.width = this.options.width || ModalMenu.styles.defaultWidth;

		// reposition the menu after rendering
		let shown = Date.now();
		container.listen((e) => {
			if (e.name === "Rendered") {
				shown = Date.now();
				this._fixPosition();
			}
		});

		// add menu items with label and/or hint
		const menuItemCellBuilder = ui.cell({
			accessibleRole: "menuitem",
			style: ModalMenu.styles.itemCellStyle,
			allowFocus: true,
			allowKeyboardFocus: true,
		});
		const disabledMenuItemCellBuilder = ui.cell({
			style: ModalMenu.styles.itemCellStyle,
			background: ui.color.CLEAR,
			textColor: ui.color.TEXT,
		});
		for (let item of this.options.items) {
			if (item.separate) {
				// add a separator
				column.content.add(new UISeparator());
				continue;
			}

			// add a menu item as a (row) cell
			let itemRow = new UIRow();
			let itemCell = item.disabled
				? disabledMenuItemCellBuilder.create()
				: menuItemCellBuilder.create();
			itemCell.content.add(itemRow);
			column.content.add(itemCell);
			itemRow.content.add(
				ui
					.label({
						text: item.text,
						icon: item.icon,
						iconSize: item.iconSize,
						dim: item.disabled,
						style: ui.style(
							ui.style.LABEL,
							ModalMenu.styles.labelStyle,
							item.labelStyle,
						),
					})
					.create(),
			);
			if (item.hint || item.hintIcon) {
				let spacer = new UISpacer();
				spacer.minWidth = 8;
				itemRow.content.add(
					spacer,
					ui
						.label({
							text: item.hint,
							icon: item.hintIcon,
							iconSize: item.hintIconSize,
							style: ui.style(
								ui.style.LABEL,
								ModalMenu.styles.hintStyle,
								item.hintStyle,
							),
						})
						.create(),
				);
			}

			// add a listener to register clicks and keyboard input
			if (item.disabled) continue;
			itemCell.listen((e) => {
				switch (e.name) {
					case "Release":
						if (Date.now() - shown < 200) break;
					case "Click":
					case "EnterKeyPress":
					case "SpacebarPress":
						this._resolve?.(item.key);
						break;
					case "ArrowDownKeyPress":
						itemCell.requestFocusNext();
						break;
					case "ArrowUpKeyPress":
						itemCell.requestFocusPrevious();
						break;
				}
			});
		}
		return container;
	}

	onArrowDownKeyPress(e: ViewEvent) {
		if (e.source !== this.body) return;
		let content = this.findViewContent(UIColumn)[0]?.content;
		if (content) {
			for (let item of content) {
				if (item instanceof UIContainer) {
					item.requestFocus();
					return;
				}
			}
		}
		return true;
	}

	onArrowUpKeyPress(e: ViewEvent) {
		if (e.source !== this.body) return;
		let content = this.findViewContent(UIColumn)[0]?.content;
		if (content) {
			let lastItem = content.last();
			if (lastItem instanceof UIContainer) {
				lastItem.requestFocus();
			}
		}
		return true;
	}

	onEscapeKeyPress() {
		this._resolve?.();
		return true;
	}

	onCloseModal() {
		this._resolve?.();
		return true;
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
		if (bounds.height) {
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
		// (vertically), and move it up or down if needed
		function checkFit() {
			let menuBounds = elt.getBoundingClientRect();
			if (menuBounds.top < 0) {
				elt.style.bottom = "auto";
				elt.style.top = -bounds.top - 4 + "px";
			} else if (!isLow && menuBounds.height > 0) {
				let roomBelow = window.innerHeight - menuBounds.bottom;
				if (roomBelow < 0) {
					let adjust = Math.max(-bounds.top, roomBelow + bounds.height - 4);
					elt.style.top = adjust + "px";
				}
			}

			// now that animation is completed, make shader scrollable again
			modalShader.style.overflow = "auto";
		}
		setTimeout(checkFit, 250);
	}

	private _resolve?: (key?: string) => void;
}
