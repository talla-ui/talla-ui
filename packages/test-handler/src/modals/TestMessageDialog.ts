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
		this.confirmLabel = this.options.confirmLabel || fmt("Dismiss");
		return this;
	}

	setConfirmButtons() {
		this.confirmLabel = this.options.confirmLabel || fmt("Confirm");
		this.cancelLabel = this.options.cancelLabel || fmt("Cancel");
		this.otherLabel = this.options.otherLabel;
		return this;
	}

	confirmLabel?: StringConvertible;
	cancelLabel?: StringConvertible;
	otherLabel?: StringConvertible;

	async showAsync(place?: Partial<RenderContext.PlacementOptions>) {
		app.render(this, { mode: "modal", ...place });
		let confirmed = false;
		let other = false;
		for await (let e of this.listenAsync()) {
			if (e.name === "Cancel" || e.name === "EscapeKeyPress") confirmed = false;
			else if (e.name === "Confirm") confirmed = true;
			else if (e.name === "Other") other = true;
			else continue;
			this.unlink();
		}
		return { confirmed, other };
	}

	protected override viewBuilder() {
		return UI.Column()
			.accessibleRole("alertdialog")
			.with(
				...this.options.messages.map((text) => UI.Label(String(text))),
				UI.Button(this.confirmLabel).emit("Confirm").requestFocus(),
				UI.Button(this.otherLabel).emit("Other").hideWhen(!this.otherLabel),
				UI.Button(this.cancelLabel).emit("Cancel").hideWhen(!this.cancelLabel),
			);
	}
}
