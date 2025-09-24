import {
	app,
	ComponentView,
	MessageDialogOptions,
	ModalFactory,
	RenderContext,
	UI,
} from "@talla-ui/core";
import { fmt, StringConvertible } from "@talla-ui/util";

/** @internal Limited implementation of a message dialog controller, that can be used to test for message display and button presses */
export class TestMessageDialog
	extends ComponentView
	implements
		ModalFactory.AlertDialogController,
		ModalFactory.ConfirmDialogController
{
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

	async showAsync(place?: Partial<RenderContext.PlacementOptions>) {
		app.render(this, { mode: "modal", ...place });
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
		let messages = this.options.messages.map((text) => UI.Text(String(text)));
		let buttons = [
			UI.Button(this.confirmText).onClick("Confirm").requestFocus(),
		];
		if (this.otherText) {
			buttons.push(UI.Button(this.otherText).onClick("Other"));
		}
		if (this.cancelText) {
			buttons.push(UI.Button(this.cancelText).onClick("Cancel"));
		}
		return UI.Column()
			.accessibleRole("alertdialog")
			.with(...messages, ...buttons)
			.build();
	}
}
