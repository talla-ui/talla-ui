import {
	app,
	MessageDialogOptions,
	ModalFactory,
	RenderContext,
	UI,
	UIContainer,
	View,
	Widget,
} from "@talla-ui/core";
import { fmt, StringConvertible } from "@talla-ui/util";
import { Dialog } from "./Dialog.js";

/** @internal Default modal message dialog view; shown asynchronously and resolves a promise */
export class MessageDialog
	extends Widget
	implements
		ModalFactory.AlertDialogController,
		ModalFactory.ConfirmDialogController
{
	static Container(): UIContainer.ContainerBuilder {
		return Dialog.Container()
			.maxWidth("min(95vw,28rem)")
			.accessibleRole("alertdialog");
	}

	static MessageContainer(): UIContainer.ContainerBuilder {
		return UI.Column()
			.padding({ top: 32, bottom: 24, x: 16 })
			.gap(8)
			.align("center")
			.effect("drag-modal", true);
	}

	static ButtonContainer(): UIContainer.ContainerBuilder {
		return UI.Row()
			.padding(24)
			.reverse(UI.viewport.cols.gt(1))
			.layout(
				UI.viewport.cols
					.gt(1)
					.then(
						{ distribution: "center", wrapContent: true },
						{ axis: "vertical", gravity: "stretch" },
					),
			);
	}

	static FirstMessageText() {
		return UI.Text().style({
			bold: true,
			textAlign: "center",
			maxWidth: 480,
			lineBreakMode: "pre-wrap",
			userTextSelect: true,
		});
	}

	static MessageText() {
		return UI.Text().style({
			textAlign: "center",
			maxWidth: 480,
			lineBreakMode: "pre-wrap",
			userTextSelect: true,
		});
	}

	static ConfirmButton() {
		return UI.Button().style("accent");
	}

	static Button() {
		return UI.Button();
	}

	constructor(public options: MessageDialogOptions) {
		super();
	}

	setAlertButton() {
		this.confirmText = this.options.confirmText || fmt("Dismiss");
		return this;
	}

	setConfirmButtons() {
		this.confirmText = this.options.confirmText || fmt("Confirm");
		this.cancelText = this.options.cancelText || fmt("Cancel");
		this.otherText = this.options.otherText;
		return this;
	}

	confirmText?: StringConvertible;
	cancelText?: StringConvertible;
	otherText?: StringConvertible;

	// Enable bindings to AppContext properties (i.e. viewport)
	appContext = app;

	async showAsync(place?: Partial<RenderContext.PlacementOptions>) {
		app.render(this, {
			mode: "modal",
			shade: true,
			...place,
		});
		let confirmed = false;
		let other = false;
		for await (let e of this.listenAsync()) {
			if (
				e.name === "Cancel" ||
				(e.name === "KeyDown" && e.data.key === "Escape")
			)
				confirmed = false;
			else if (e.name === "Confirm") confirmed = true;
			else if (e.name === "Other") other = true;
			else continue;
			this.unlink();
		}
		return { confirmed, other };
	}

	protected override get body() {
		if (this._body) return this._body;
		let messages = this.options.messages.map((text, i) =>
			(i ? MessageDialog.MessageText : MessageDialog.FirstMessageText)().text(
				text,
			),
		);
		let buttons = [
			MessageDialog.ConfirmButton()
				.text(this.confirmText)
				.onClick("Confirm")
				.requestFocus(),
		];
		if (this.otherText) {
			buttons.push(
				MessageDialog.Button().text(this.otherText).onClick("Other"),
			);
		}
		if (this.cancelText) {
			buttons.push(
				MessageDialog.Button().text(this.cancelText).onClick("Cancel"),
			);
		}
		this._body = MessageDialog.Container()
			.effect(Dialog.dialogEffect)
			.with(
				MessageDialog.MessageContainer().with(...messages),
				MessageDialog.ButtonContainer().with(...buttons),
			)
			.build();
		return this._body;
	}
	private _body?: View;
}
