import {
	app,
	MessageDialogOptions,
	RenderContext,
	strf,
	StringConvertible,
	UIButton,
	UICell,
	UILabel,
	UITheme,
	ViewComposite,
} from "@desk-framework/frame-core";

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

	showAsync(place?: Partial<RenderContext.PlacementOptions>) {
		// return a promise that's resolved when one of the buttons is pressed
		return new Promise<{ confirmed: boolean; other?: boolean }>((r) => {
			app.render(this, {
				mode: "dialog",
				...place,
			});
			this._resolve = (result) => {
				this.unlink();
				r(result);
			};
		});
	}

	protected override createView() {
		return new (UICell.with(
			{ accessibleRole: "alertdialog" },
			...this.options.messages.map((text) => UILabel.withText(text)),
			UIButton.with({
				label: this.confirmLabel,
				onClick: "+Confirm",
				requestFocus: true,
			}),
			UIButton.with({
				hidden: !this.otherLabel,
				label: this.otherLabel,
				onClick: "+Other",
			}),
			UIButton.with({
				hidden: !this.cancelLabel,
				label: this.cancelLabel,
				onClick: "+Cancel",
			}),
		))();
	}

	onConfirm() {
		this._resolve?.({ confirmed: true });
	}
	onOther() {
		this._resolve?.({ confirmed: false, other: true });
	}
	onCancel() {
		this._resolve?.({ confirmed: false });
	}
	onEscapeKeyPress() {
		this._resolve?.({ confirmed: false });
	}

	private _resolve?: (result: { confirmed: boolean; other?: boolean }) => void;
}
