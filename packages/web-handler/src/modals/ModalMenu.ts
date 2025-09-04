import {
	ComponentView,
	ModalFactory,
	ModalMenuOptions,
	RenderContext,
	UI,
	UICell,
	UIStyle,
	ViewEvent,
	app,
} from "@talla-ui/core";
import { ConfigOptions } from "@talla-ui/util";
import { reduceElementMotion } from "../WebOutputTransform.js";

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
 * - These styles are used by the default menu view referenced by {@link AppContext.showModalMenuAsync app.showModalMenuAsync()}.
 *
 * @see {@link WebContextOptions}
 * @see {@link ModalFactory}
 */
export class WebModalMenuStyles extends ConfigOptions {
	/** The default width that's used if none is specified in menu options */
	defaultWidth = 260;

	/** The vertical distance from the reference element, in pixels; defaults to 2 */
	offset = 2;

	/**
	 * The cell style used for the outer menu container
	 * - The default style includes properties for padding, background, and border radius.
	 */
	containerStyle = new UIStyle({
		background: UI.colors.background.brighten(0.1),
		padding: { y: 4 },
		borderRadius: 8,
		grow: 0,
		dropShadow: 4,
	});

	/**
	 * The cell style used for each menu item
	 * - The default style includes properties for padding, cursor, and (hover/focus) background color
	 */
	itemCellStyle = new UIStyle(
		{
			margin: { x: 4 },
			padding: { x: 16, y: 6 },
			borderRadius: 6,
			cursor: "pointer",
		},
		{
			[UIStyle.STATE_HOVERED]: true,
			background: UI.colors.background.fg(
				UI.colors.background.contrast(-0.1),
				UI.colors.background.contrast(-0.3),
			),
		},
		{
			[UIStyle.STATE_FOCUSED]: true,
			background: UI.colors.background.fg(
				UI.colors.background.contrast(-0.1),
				UI.colors.background.contrast(-0.3),
			),
		},
	);

	/**
	 * The label style used for each menu item label
	 * - This property defaults to the default label style.
	 */
	labelStyle = UI.styles.label.default;

	/**
	 * The label style used for each menu item hint
	 * - The default style includes a smaller font size and reduced opacity
	 */
	hintStyle = UI.styles.label.default.extend({
		opacity: 0.5,
		fontSize: 12,
		shrink: 0,
	});

	/** The margin around a divider line, in pixels */
	dividerMargin = 6;
}

/** @internal Default modal menu view; shown asynchronously and resolves a promise */
export class ModalMenu
	extends ComponentView
	implements ModalFactory.MenuController
{
	static styles = new WebModalMenuStyles();

	constructor(public options: ModalMenuOptions) {
		super();
	}

	async showAsync(place?: Partial<RenderContext.PlacementOptions>) {
		// return a promise that's resolved when one of the items is selected
		// or when the menu is dismissed otherwise
		return new Promise<{ key: string } | undefined>((r) => {
			app.render(this, {
				mode: "modal",
				transform: {
					show: UI.animations.showMenu,
					hide: UI.animations.hideMenu,
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

	protected override get body() {
		let shown = Date.now();
		return UI.Cell()
			.style(ModalMenu.styles.containerStyle)
			.width(this.options.width || ModalMenu.styles.defaultWidth)
			.minWidth(this.options.minWidth)
			.position(_containerPosition)
			.accessibleRole("menu")
			.onRendered(() => {
				shown = Date.now();
				this._fixPosition();
			})
			.handle("Select", (e) => this._resolve?.(e.data.key as string))
			.with(
				...this.options.items.map((item) => {
					if (item.divider) {
						return UI.Divider().lineMargin(ModalMenu.styles.dividerMargin);
					}

					// use label builders for the label and hint, if any
					const itemLabel = () =>
						UI.Label(item.text)
							.icon(item.icon, item.iconSize)
							.dim(!!item.disabled)
							.labelStyle(
								ModalMenu.styles.labelStyle.override(item.labelStyle),
							);
					const itemHint = () =>
						UI.Label(item.hint)
							.icon(item.hintIcon, item.hintIconSize)
							.labelStyle(ModalMenu.styles.hintStyle.override(item.hintStyle));
					const content =
						item.hint || item.hintIcon
							? UI.Row(itemLabel(), UI.Spacer(), itemHint())
							: itemLabel();

					// add a disabled item without event handlers
					if (item.disabled) {
						return UI.Cell()
							.style(ModalMenu.styles.itemCellStyle)
							.bg("transparent")
							.fg("text")
							.with(content);
					}

					// else, add the menu item with event handlers
					return UI.Cell()
						.style(ModalMenu.styles.itemCellStyle)
						.accessibleRole("menuitem")
						.allowKeyboardFocus()
						.handleKey("ArrowDown", (_, self) => self.requestFocusNext())
						.handleKey("ArrowUp", (_, self) => self.requestFocusPrevious())
						.handleKey("Enter", "Click")
						.handleKey("Spacebar", "Click")
						.onRelease((_, self) => {
							if (Date.now() - shown < 200) return;
							self.emit("Select", item);
						})
						.onClick((_, self) => self.emit("Select", item))
						.with(content);
				}),
			)
			.build();
	}

	onKeyDown(e: ViewEvent) {
		let cell = this.findViewContent(UICell)[0];
		let content = cell!.content;
		switch (e.data.key) {
			case "ArrowDown":
				if (e.source !== cell) return;
				for (let item of content) {
					if (item instanceof UICell) {
						item.requestFocus();
						return;
					}
				}
				return true;
			case "ArrowUp":
				if (e.source !== cell) return;
				let lastItem = content.last();
				if (lastItem instanceof UICell) {
					lastItem.requestFocus();
				}
				return true;
			case "Escape":
				this._resolve?.();
				return true;
		}
	}

	onCloseModal() {
		this._resolve?.();
		return true;
	}

	private _fixPosition() {
		let cell = this.findViewContent(UICell)[0];
		let elt = cell?.lastRenderOutput?.element as HTMLElement;
		if (!elt) return;

		// make sure the menu appears within the screen bounds,
		// even if the modal wrapper bounds are at the bottom or
		// on the opposite side (place menu above, or align right/left in LTR/RTL)
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
