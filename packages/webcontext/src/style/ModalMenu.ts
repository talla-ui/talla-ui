import {
	Observer,
	RenderContext,
	UICell,
	UICellStyle,
	UIColor,
	UIComponentEvent,
	UIContainer,
	UILabel,
	UILabelStyle,
	UISeparator,
	UISpacer,
	UITheme,
	ViewComposite,
	app,
} from "desk-frame";
import { reduceElementMotion } from "../renderer/WebOutputTransform";

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
 *
 * @example
 * useWebContext((options) => {
 *   options.modalMenuStyles.ContainerStyle =
 *     options.modalMenuStyles.ContainerStyle.extend({
 *       padding: 0,
 *       borderRadius: 0,
 *     })
 * });
 */
export class ModalMenuStyles {
	/**
	 * The cell style used for the outer menu container
	 * - The default style includes properties for dimensions, padding, background, border radius, and drop shadow
	 */
	ContainerStyle: UITheme.StyleClassType<UICellStyle> = UICellStyle.extend({
		background: UIColor["@background"],
		borderRadius: 12,
		padding: { y: 8 },
		dropShadow: 0.8,
		width: "100%",
		minWidth: 200,
		maxWidth: 280,
	});

	/**
	 * The cell style used for each menu item
	 * - The default style includes properties for padding, cursor, and (hover/focus) background color
	 */
	ItemStyle: UITheme.StyleClassType<UICellStyle> = UICellStyle.extend(
		{
			padding: { x: 16 },
			css: { cursor: "pointer" },
		},
		{
			[UITheme.STATE_HOVERED]: true,
			background: UIColor["@primaryBackground"],
			textColor: UIColor["@primaryBackground"].text(),
		},
		{
			[UITheme.STATE_FOCUSED]: true,
			background: UIColor["@primaryBackground"],
			textColor: UIColor["@primaryBackground"].text(),
		},
	);

	/**
	 * The label style used for each menu item label
	 * - This property defaults to {@link UILabelStyle} itself.
	 */
	LabelStyle: UITheme.StyleClassType<UILabelStyle> = UILabelStyle;

	/**
	 * The label style used for each menu item hint
	 * - The default style includes a smaller font size and reduced opacity
	 */
	HintStyle: UITheme.StyleClassType<UILabelStyle> = UILabelStyle.extend({
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
		// render the view, keep a reference in order to remove it later
		let handler = app.render(this, {
			mode: "modal",
			transform: {
				show: "@show-menu",
				hide: "@hide-menu",
			},
			...place,
		});

		// return a promise that's resolved when one of the items is selected
		// or when the menu is dismissed otherwise
		// (remember resolve function for later)
		return new Promise<{ key: string } | undefined>((r) => {
			this._resolve = (key) => {
				handler.removeAsync();
				r(key ? { key } : undefined);
			};
		});
	}

	override createView() {
		// create modal container
		let container = new UICell();
		container.accessibleRole = "menu";
		container.position = _containerPosition;
		container.cellStyle = this.options.width
			? ModalMenu.styles.ContainerStyle.override({
					width: this.options.width,
					minWidth: 0,
					maxWidth: "none",
			  })
			: ModalMenu.styles.ContainerStyle;

		// reposition the menu after rendering
		container.listen((e) => {
			if (e.name === "Rendered") this._fixPosition();
		});

		// add menu items with label and/or hint
		for (let item of this.options.items) {
			if (item.separate) {
				// add a separator
				container.content.add(new UISeparator());
				continue;
			}

			// add a menu item as a (row) cell
			let itemRow = new UICell();
			itemRow.accessibleRole = "menuitem";
			itemRow.cellStyle = ModalMenu.styles.ItemStyle;
			itemRow.allowFocus = true;
			itemRow.allowKeyboardFocus = true;
			itemRow.layout = { axis: "horizontal", distribution: "start" };
			container.content.add(itemRow);
			let itemLabel = new UILabel(item.text);
			itemRow.content.add(itemLabel);
			if (item.icon) itemLabel.icon = item.icon;
			itemLabel.labelStyle = item.labelStyle
				? ModalMenu.styles.LabelStyle.override(item.labelStyle)
				: ModalMenu.styles.LabelStyle;
			if (item.hint || item.hintIcon) {
				let hintLabel = new UILabel(item.hint);
				if (item.hintIcon) hintLabel.icon = item.hintIcon;
				hintLabel.labelStyle = item.hintStyle
					? ModalMenu.styles.HintStyle.override(item.hintStyle)
					: ModalMenu.styles.HintStyle;
				let spacer = new UISpacer();
				spacer.minWidth = 8;
				itemRow.content.add(spacer, hintLabel);
			}

			// add an observer to register clicks and keyboard input
			let self = this;
			class ItemObserver extends Observer<UICell> {
				onClick() {
					self._resolve?.(item.key);
				}
				onEnterKeyPress() {
					self._resolve?.(item.key);
				}
				onArrowDownKeyPress() {
					itemRow.requestFocusNext();
				}
				onArrowUpKeyPress() {
					itemRow.requestFocusPrevious();
				}
			}
			new ItemObserver().observe(itemRow);
		}
		return container;
	}

	onArrowDownKeyPress(e: UIComponentEvent) {
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

	onArrowUpKeyPress(e: UIComponentEvent) {
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
