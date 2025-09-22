import {
	app,
	ComponentView,
	ModalFactory,
	ModalMenuOptions,
	RenderContext,
	UI,
	ViewBuilder,
	ViewEvent,
} from "@talla-ui/core";

/** @internal Limited implementation of a menu controller, that can be used to test menu selection using label clicks */
export class TestModalMenu
	extends ComponentView
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
		let labels: ViewBuilder[] = [];
		for (let item of this.options.items) {
			if (item.divider) continue;

			// use label builders for the label and hint, if any
			const itemLabel = () =>
				UI.Label(item.text).icon(item.icon, item.iconStyle);
			const itemHint = () =>
				UI.Label(item.hint).icon(item.hintIcon, item.hintIconStyle);
			const content =
				item.hint || item.hintIcon
					? UI.Row(itemLabel(), UI.Spacer(), itemHint())
					: itemLabel();

			// add a disabled item without event handlers
			if (item.disabled) {
				labels.push(UI.Cell().with(content));
				continue;
			}

			// else, add the menu item with event handlers
			labels.push(
				UI.Cell()
					.accessibleRole("menuitem")
					.onClick(() => {
						this._resolve?.(item.value);
					})
					.with(content),
			);
		}
		return UI.Cell()
			.accessibleRole("menu")
			.with(...labels)
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
