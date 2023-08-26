import {
	app,
	RenderContext,
	strf,
	StringConvertible,
	UIButton,
	UICell,
	UILabel,
	UISeparator,
	UIStyle,
	UITheme,
	ViewComposite,
} from "desk-frame";

/** Limited implementation of a confirmation dialog builder, can be used to test confirm/cancel actions using button presses */
class TestDialogController implements UITheme.ConfirmationDialogController {
	constructor(
		confirmLabel: StringConvertible = strf("Dismiss"),
		cancelLabel?: StringConvertible
	) {
		this._confirmLabel = confirmLabel;
		this._cancelLabel = cancelLabel;
	}

	setTitle(title: StringConvertible) {
		this._title = title;
		return this;
	}
	addMessage(message: StringConvertible) {
		this._messages.push(message);
		return this;
	}
	setButtonLabel(label: StringConvertible) {
		this._confirmLabel = label;
		return this;
	}
	setConfirmButtonLabel(label: StringConvertible) {
		this._confirmLabel = label;
		return this;
	}
	setCancelButtonLabel(label: StringConvertible) {
		this._cancelLabel = label;
		return this;
	}
	showAsync(place?: Partial<RenderContext.PlacementOptions>) {
		// create the simplest UI that contains all elements
		let controller = this;
		const Preset = UICell.with(
			controller._title ? UILabel.withText(controller._title) : undefined,
			...controller._messages.map((m) => UILabel.withText(m)),
			UIButton.withLabel(
				controller._confirmLabel || strf("Dismiss"),
				"Confirm"
			),
			controller._cancelLabel
				? UIButton.withLabel(controller._cancelLabel, "Cancel")
				: undefined
		);
		class DialogView extends ViewComposite {
			protected override createView() {
				return new Preset();
			}
			onConfirm() {
				controller._resolve?.(true);
			}
			onCancel() {
				controller._resolve?.(false);
			}
		}
		let rendered = app.render(new DialogView(), { mode: "dialog", ...place });

		// return a promise that's resolved when one of the buttons is pressed
		return new Promise<{ confirmed: boolean }>((r) => {
			this._resolve = (confirmed) => {
				rendered.removeAsync();
				r({ confirmed });
			};
		});
	}
	private _resolve?: (confirmed: boolean) => void;
	private _messages: StringConvertible[] = [];
	private _title?: StringConvertible;
	private _confirmLabel?: StringConvertible;
	private _cancelLabel?: StringConvertible;
}

/** Limited implementation of menu controller, can be used to test menu selection using label clicks */
class TestMenuController implements UITheme.MenuController {
	setWidth() {
		// do nothing here
		return this;
	}
	addItem(item: UITheme.MenuItem) {
		// create the simplest UI that contains all elements
		let controller = this;
		if (item.separate) this._items.push(UISeparator);
		const Preset = UICell.with(
			UILabel.with({
				text: item.text,
				icon: item.icon,
				textStyle: item.textStyle,
			})
		);
		this._items.push(
			class extends ViewComposite {
				protected override createView() {
					return new Preset();
				}
				onClick() {
					controller._resolve?.(item.key);
				}
			}
		);
		return this;
	}
	addItemGroup(
		items: UITheme.MenuItem[],
		selectedKey?: string | undefined,
		textStyle?: UIStyle.Definition.TextStyle
	) {
		for (let item of items) {
			this.addItem({
				...item,
				textStyle,
				icon: item.key === selectedKey ? "@Check" : "@Blank",
			});
		}
		return this;
	}
	showAsync(place?: Partial<RenderContext.PlacementOptions>) {
		let MenuCell = UICell.with(...(this._items as any));
		let rendered = app.render(new MenuCell(), { mode: "modal", ...place });

		// return a promise that's resolved when one of the items is selected
		return new Promise<{ key: string }>((r) => {
			this._resolve = (key) => {
				rendered.removeAsync();
				r({ key });
			};
		});
	}
	private _resolve?: (key: string) => void;
	private _items: RenderContext.RenderableClass[] = [];
}

/** @internal */
export class TestModalFactory implements UITheme.ModalControllerFactory {
	createAlertDialog() {
		return new TestDialogController();
	}
	createConfirmationDialog() {
		return new TestDialogController(strf("Confirm"), strf("Cancel"));
	}
	createMenu() {
		return new TestMenuController();
	}
}

/** @internal */
export class TestTheme extends UITheme {
	constructor() {
		super();
		this.modalFactory = new TestModalFactory();
	}
}
