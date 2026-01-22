import {
	app,
	ModalFactory,
	ModalMenuOptions,
	RenderContext,
	UI,
	ViewBuilder,
	ViewEvent,
	Widget,
} from "@talla-ui/core";

/** @internal Limited implementation of a menu controller, that can be used to test menu selection using text element clicks */
export class TestModalMenu
	extends Widget
	implements ModalFactory.MenuController
{
	constructor(public options: ModalMenuOptions) {
		super();
	}

	async showAsync(place?: Partial<RenderContext.PlacementOptions>) {
		// return a promise that's resolved when one of the items is selected
		// or when the menu is dismissed otherwise
		return new Promise<{ value: unknown } | undefined>((r) => {
			app.render(this, {
				mode: "modal",
				...place,
			});
			this._resolve = (value) => {
				this.unlink();
				r(value != null ? { value } : undefined);
			};
		});
	}

	protected override get body() {
		let texts: ViewBuilder[] = [];
		for (let item of this.options.items) {
			if (item.divider) continue;

			// use text builders for the text and hint, if any
			const itemText = () => UI.Text(item.text).icon(item.icon, item.iconStyle);
			const itemHint = () =>
				UI.Text(item.hint).icon(item.hintIcon, item.hintIconStyle);
			const content =
				item.hint || item.hintIcon
					? UI.Row(itemText(), UI.Spacer(), itemHint())
					: itemText();

			// add a disabled item without event handlers
			if (item.disabled) {
				texts.push(UI.Column(content));
				continue;
			}

			// else, add the menu item with event handlers
			texts.push(
				UI.Column()
					.accessibleRole("menuitem")
					.onClick(() => {
						this._resolve?.(item.value);
					})
					.with(content),
			);
		}
		return UI.Column()
			.accessibleRole("menu")
			.with(...texts)
			.build();
	}

	onKeyDown(e: ViewEvent) {
		if (e.data.key === "Escape") {
			this._resolve?.();
			return true;
		}
	}

	onCloseModal() {
		this._resolve?.();
		return true;
	}

	private _resolve?: (value?: unknown) => void;
}
