import {
	app,
	ComponentView,
	ModalFactory,
	ModalMenuOptions,
	RenderContext,
	UI,
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
		return new Promise<{ key: string } | undefined>((r) => {
			app.render(this, {
				mode: "modal",
				...place,
			});
			this._resolve = (key) => {
				this.unlink();
				r(key ? { key } : undefined);
			};
		});
	}

	protected override get body() {
		return UI.Cell()
			.accessibleRole("menu")
			.intercept("Select", (e) => this._resolve?.(e.data.key as string))
			.with(
				...this.options.items.map((item) => {
					if (item.divider) return UI.Divider();

					// use label builders for the label and hint, if any
					const itemLabel = () =>
						UI.Label(item.text).icon(item.icon, item.iconSize);
					const itemHint = () =>
						UI.Label(item.hint).icon(item.hintIcon, item.hintIconSize);
					const content =
						item.hint || item.hintIcon
							? UI.Row(itemLabel(), UI.Spacer(), itemHint())
							: itemLabel();

					// add a disabled item without event handlers
					if (item.disabled) {
						return UI.Cell().with(content);
					}

					// else, add the menu item with event handlers
					return UI.Cell()
						.accessibleRole("menuitem")
						.intercept("Click", "Select", item)
						.with(content);
				}),
			)
			.create();
	}

	onEscapeKeyPress() {
		this._resolve?.();
		return true;
	}

	onCloseModal() {
		this._resolve?.();
		return true;
	}

	private _resolve?: (key?: string) => void;
}
