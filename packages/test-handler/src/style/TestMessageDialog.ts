import {
	app,
	MessageDialogOptions,
	RenderContext,
	strf,
	StringConvertible,
	ui,
	UITheme,
	ViewComposite,
} from "talla-ui";

/** @internal Limited implementation of a message dialog controller, that can be used to test for message display and button presses */
export class TestMessageDialog
	extends ViewComposite
	implements UITheme.AlertDialogController, UITheme.ConfirmDialogController
{
	constructor(public options: MessageDialogOptions) {
		super();
	}

	setAlertButton() {
		this.confirmLabel = this.options.confirmLabel || strf("Dismiss");
		return this;
	}

	setConfirmButtons() {
		this.confirmLabel = this.options.confirmLabel || strf("Confirm");
		this.cancelLabel = this.options.cancelLabel || strf("Cancel");
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
		for await (let e of this.listen(true)) {
			if (e.name === "Cancel" || e.name === "EscapeKeyPress") confirmed = false;
			else if (e.name === "Confirm") confirmed = true;
			else if (e.name === "Other") other = true;
			else continue;
			this.unlink();
		}
		return { confirmed, other };
	}

	protected override createView() {
		return ui
			.column(
				{ accessibleRole: "alertdialog" },
				...this.options.messages.map((text) => ui.label(String(text))),
				ui.button({
					label: this.confirmLabel,
					onClick: "+Confirm",
					requestFocus: true,
				}),
				ui.button({
					hidden: !this.otherLabel,
					label: this.otherLabel,
					onClick: "+Other",
				}),
				ui.button({
					hidden: !this.cancelLabel,
					label: this.cancelLabel,
					onClick: "+Cancel",
				}),
			)
			.create();
	}
}
