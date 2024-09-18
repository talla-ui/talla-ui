import {
	MessageDialogOptions,
	RenderContext,
	StringConvertible,
	UICell,
	UIContainer,
	UIStyle,
	UITheme,
	ViewComposite,
	app,
	strf,
	ui,
} from "talla-ui";
import { DialogStyles } from "./Dialog.js";

/**
 * A class that defines the styles for the default modal message dialog view
 * - A default instance of this class is created, and can be modified in the {@link WebContextOptions} configuration callback passed to {@link useWebContext}.
 * - These styles are used by the default message dialog view referenced by the {@link UITheme} implementation — and therefore also by {@link AppContext.showAlertDialogAsync app.showAlertDialogAsync()} and {@link AppContext.showConfirmDialogAsync app.showConfirmDialogAsync()}.
 * - The default dialog view includes an outer container, a block of message labels, and a block of buttons.
 *
 * @see {@link WebContextOptions}
 * @see {@link UITheme.ModalControllerFactory}
 */
export class MessageDialogStyles extends DialogStyles {
	constructor() {
		super();

		// restrict message dialogs to 95vw width
		this.containerStyle = (
			this.containerStyle as UIStyle.Type<UICell.StyleType>
		).extend({ maxWidth: "95vw" });
	}

	/**
	 * The cell style used for the block of messages
	 * - The default style only includes padding. A `DragModal` effect is applied to the container to use the cell as a grab handle for the entire dialog.
	 */
	messageCellStyle: ui.CellStyle = ui.style.CELL.extend({
		padding: 16,
	});

	/**
	 * The cell style used for the block of buttons
	 * - The default style only includes padding.
	 */
	buttonCellStyle: ui.CellStyle = ui.style.CELL.extend({
		padding: 16,
	});

	/**
	 * Options for the layout of the row of buttons
	 * - By default, buttons are centered horizontally, and wrap to multiple lines if necessary.
	 */
	buttonRowLayout: UIContainer.Layout = {
		distribution: "center",
		wrapContent: true,
	};

	/**
	 * True if the buttons should be shown in reverse order
	 * - This property defaults to true, which means that the confirm button is displayed last. Set to false to display the confirm button first.
	 */
	reverseButtons = true;

	/**
	 * The label style used for the first message label
	 * - The default style includes centered, bold text, with a maximum width of 480 pixels.
	 */
	firstLabelStyle: ui.LabelStyle = ui.style.LABEL.extend({
		bold: true,
		textAlign: "center",
		maxWidth: 480,
		lineBreakMode: "pre-wrap",
		userSelect: true,
	});

	/**
	 * The label style used for all labels except the first
	 * - The default style includes centered text, with a maximum width of 480 pixels.
	 */
	labelStyle: ui.LabelStyle = ui.style.LABEL.extend({
		textAlign: "center",
		maxWidth: 480,
		lineBreakMode: "pre-wrap",
		userSelect: true,
	});

	/**
	 * The button style used for all buttons except the confirm button
	 * - This property defaults to the default button style.
	 */
	buttonStyle: ui.ButtonStyle = ui.style.BUTTON;

	/**
	 * The button style used for the confirm button
	 * - This property defaults to the default primary button style.
	 */
	confirmButtonStyle: ui.ButtonStyle = ui.style.BUTTON_PRIMARY;
}

/** @internal Default modal message dialog view; shown asynchronously and resolves a promise */
export class MessageDialog
	extends ViewComposite
	implements UITheme.AlertDialogController, UITheme.ConfirmDialogController
{
	static styles = new MessageDialogStyles();

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
		app.render(this, {
			mode: "modal",
			shade: true,
			transform: {
				show: ui.animation.SHOW_DIALOG,
				hide: ui.animation.HIDE_DIALOG,
			},
			...place,
		});
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
		let messageLabels = this.options.messages.map((text, i) =>
			ui.label(
				String(text),
				i
					? MessageDialog.styles.labelStyle
					: MessageDialog.styles.firstLabelStyle,
			),
		);
		let buttons = [
			ui.button({
				style: MessageDialog.styles.confirmButtonStyle,
				label: this.confirmLabel,
				onClick: "+Confirm",
				requestFocus: true,
			}),
			ui.button({
				style: MessageDialog.styles.buttonStyle,
				hidden: !this.otherLabel,
				label: this.otherLabel,
				onClick: "+Other",
			}),
			ui.button({
				style: MessageDialog.styles.buttonStyle,
				hidden: !this.cancelLabel,
				label: this.cancelLabel,
				onClick: "+Cancel",
			}),
		];
		if (MessageDialog.styles.reverseButtons) buttons.reverse();
		return new (ui.cell(
			{
				accessibleRole: "alertdialog",
				margin: MessageDialog.styles.margin,
				effect: MessageDialog.styles.effect,
				style: MessageDialog.styles.containerStyle,
			},
			ui.cell(
				{
					effect: ui.effect("DragModal"),
					style: MessageDialog.styles.messageCellStyle,
				},
				ui.column(...messageLabels),
			),
			ui.cell(
				{ style: MessageDialog.styles.buttonCellStyle },
				ui.row({ layout: MessageDialog.styles.buttonRowLayout }, ...buttons),
			),
		))();
	}
}
