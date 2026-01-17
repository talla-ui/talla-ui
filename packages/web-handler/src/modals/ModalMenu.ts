import {
	ModalFactory,
	ModalMenuOptions,
	RenderContext,
	UI,
	UICell,
	UIContainer,
	UIScrollView,
	UIText,
	ViewBuilder,
	ViewEvent,
	Widget,
	app,
} from "@talla-ui/core";
import { reduceElementMotion } from "../WebOutputTransform.js";

/** The default width that's used if none is specified */
const DEFAULT_WIDTH = 260;

/** The default icon style that's used if none is specified */
const DEFAULT_ICON_STYLE: UIText.IconStyle = { margin: "gap" };

/** @internal Default modal menu view; shown asynchronously and resolves a promise */
export class ModalMenu extends Widget implements ModalFactory.MenuController {
	/** Defaults for vertical menu offset, applied to new {@link WebTheme} instances */
	static readonly OFFSET_DEFAULT = 2;

	/** Vertical menu offset, updated by {@link setWebTheme} */
	static menuOffset = 2;

	static Container(): UIContainer.ContainerBuilder {
		return UI.Cell()
			.accessibleRole("menu")
			.scroll()
			.style({
				maxHeight: "90vh",
				background: UI.colors.background.brighten(0.1),
				padding: { y: 4 },
				borderRadius: 8,
				grow: 0,
				dropShadow: 4,
			})
			.position({
				gravity: "overlay",
				top: "100%",
				bottom: "auto",
				start: 0,
			});
	}

	static ItemCell() {
		return UI.Cell().style("ModalMenu-item");
	}

	static ItemText() {
		return UI.Text();
	}

	static ItemHint() {
		return UI.Text().opacity(0.5).fontSize(12).shrink(0);
	}

	static TitleText() {
		return UI.Text().style({
			margin: { x: 16, top: 4, bottom: 8 },
			bold: true,
			fontSize: 11,
			opacity: 0.3,
		});
	}

	static Divider() {
		return UI.Divider().lineMargin(6);
	}

	constructor(public options: ModalMenuOptions) {
		super();
	}

	async showAsync(place?: Partial<RenderContext.PlacementOptions>) {
		// return a promise that's resolved when one of the items is selected
		// or when the menu is dismissed otherwise
		return new Promise<{ value: unknown } | undefined>((r) => {
			app.render(this, {
				mode: "modal",
				transform: {
					show: UI.animations.showMenu,
					hide: UI.animations.hideMenu,
				},
				refOffset: [0, ModalMenu.menuOffset],
				...place,
			});
			this._resolve = (value) => {
				this.unlink();
				r(value != null ? { value } : undefined);
			};
		});
	}

	protected override get body() {
		let shown = Date.now();

		// Add blank icons to items in groups that have at least one icon
		let items = this.options.items.slice();
		const fillBlankIcons = (start: number, end: number) => {
			let segment = items.slice(start, end);
			if (segment.every((item) => item.divider || !item.icon)) return;
			for (let i = start; i < end; i++) {
				let it = items[i]!;
				if (!it.divider && !it.icon) {
					items[i] = { ...it, icon: UI.icons.blank };
				}
			}
		};
		let start = 0;
		for (let i = 0; i < items.length; i++) {
			let it = items[i]!;
			if (it.divider) {
				fillBlankIcons(start, i);
				start = i + 1;
			}
		}
		fillBlankIcons(start, items.length);

		// prepare all view builders for item content
		let texts: ViewBuilder[] = [];
		for (let item of items) {
			if (item.divider) {
				if (texts.length) texts.push(ModalMenu.Divider());
				if (item.title) {
					texts.push(ModalMenu.TitleText().text(item.title));
				}
				continue;
			}

			// use text element builders for the text and hint, if any
			const itemText = () =>
				ModalMenu.ItemText()
					.text(item.text)
					.icon(item.icon, item.iconStyle || DEFAULT_ICON_STYLE)
					.dim(!!item.disabled)
					.style(item.textStyle); // override, if any
			const itemHint = () =>
				ModalMenu.ItemHint()
					.text(item.hint)
					.icon(item.hintIcon, item.hintIconStyle)
					.style(item.hintStyle);
			const content =
				item.hint || item.hintIcon
					? UI.Row(itemText(), UI.Spacer(), itemHint())
					: itemText();

			// add a disabled item without event handlers
			if (item.disabled) {
				texts.push(
					ModalMenu.ItemCell().bg("transparent").fg("text").with(content),
				);
				continue;
			}

			// else, add the menu item with event handlers
			texts.push(
				ModalMenu.ItemCell()
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
					.with(content),
			);
		}

		return ModalMenu.Container()
			.width(this.options.width || DEFAULT_WIDTH)
			.minWidth(this.options.minWidth)
			.onRendered(() => {
				shown = Date.now();
				this._fixPosition();
			})
			.handle("Select", (e) => this._resolve?.(e.data.value))
			.with(...texts)
			.build();
	}

	onKeyDown(e: ViewEvent) {
		let view = this.findViewContent(UIScrollView)[0]!;
		let content = (view!.content.first() as UICell).content;
		let key = e.data.key;
		if (typeof key !== "string") return;
		switch (key) {
			case "ArrowDown":
				if (e.source !== view) return;
				for (let item of content) {
					if (item instanceof UICell) {
						item.requestFocus();
						return;
					}
				}
				return true;
			case "ArrowUp":
				if (e.source !== view) return;
				let lastItem = content.last();
				if (lastItem instanceof UICell) {
					lastItem.requestFocus();
				}
				return true;
			case "Escape":
				this._resolve?.();
				return true;
		}

		// type to search, using buffer and item text
		let letter = String(key).toUpperCase();
		if (letter.length > 1 || letter < "A" || letter > "Z") return;
		if (!(this._lastKeyDown! > Date.now() - 500)) {
			this._keyBuffer = "";
		}
		this._lastKeyDown = Date.now();
		let buffer = (this._keyBuffer += letter);
		let textViews = view.findViewContent(UIText);
		for (let t of textViews) {
			if (
				String(t.text || "")
					.toUpperCase()
					.startsWith(buffer)
			) {
				UICell.whence(t)?.requestFocus();
				return true;
			}
		}
	}

	onCloseModal() {
		this._resolve?.();
		return true;
	}

	private _fixPosition() {
		let view = this.findViewContent(UIScrollView)[0];
		let elt = view?.lastRenderOutput?.element as HTMLElement;
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
			if (typeof document === "undefined") return;
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

	private _keyBuffer?: string;
	private _lastKeyDown?: number;
	private _resolve?: (value?: unknown) => void;
}
