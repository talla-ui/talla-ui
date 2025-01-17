import {
	app,
	ModalMenuOptions,
	RenderContext,
	UICell,
	UILabel,
	UISeparator,
	UITheme,
	ViewComposite,
} from "@talla-ui/core";

/** @internal Limited implementation of a menu controller, that can be used to test menu selection using label clicks */
export class TestModalMenu
	extends ViewComposite
	implements UITheme.MenuController
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

	override createView() {
		// create modal container
		let container = new UICell();
		container.accessibleRole = "menu";

		// add menu items with label and/or hint
		for (let item of this.options.items) {
			if (item.separate) {
				// add a separator
				container.content.add(new UISeparator());
				continue;
			}

			// add a menu item
			let itemRow = new UICell();
			itemRow.accessibleRole = "menuitem";
			itemRow.allowFocus = true;
			itemRow.allowKeyboardFocus = true;
			container.content.add(itemRow);
			let itemLabel = new UILabel(item.text);
			if (item.disabled) itemLabel.dim = true;
			itemRow.content.add(itemLabel);
			if (item.icon) itemLabel.icon = item.icon;
			if (item.hint || item.hintIcon) {
				let hintLabel = new UILabel(item.hint);
				if (item.hintIcon) hintLabel.icon = item.hintIcon;
				itemRow.content.add(hintLabel);
			}

			// add an observer to register clicks and keyboard input
			if (item.disabled) continue;
			itemRow.listen((e) => {
				if (e.name === "Click") {
					this._resolve?.(item.key);
				}
			});
		}
		return container;
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
