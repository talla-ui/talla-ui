import {
	MessageDialogOptions,
	RenderContext,
	UIButton,
	UICell,
	UIComponent,
	UIContainer,
	UILabel,
	UITheme,
	app,
	ui,
} from "@talla-ui/core";
import { StringConvertible, strf } from "@talla-ui/util";
import { WebDialogStyles } from "./Dialog.js";

/**
 * A class that defines the styles for the default modal message dialog view
 * - A default instance of this class is created, and can be modified in the {@link WebContextOptions} configuration callback passed to {@link useWebContext}.
 * - These styles are used by the default message dialog view referenced by the {@link UITheme} implementation — and therefore also by {@link AppContext.showAlertDialogAsync app.showAlertDialogAsync()} and {@link AppContext.showConfirmDialogAsync app.showConfirmDialogAsync()}.
 * - The default dialog view includes an outer container, a block of message labels, and a block of buttons.
 *
 * @see {@link WebContextOptions}
 * @see {@link UITheme.ModalControllerFactory}
 */
export class WebMessageDialogStyles extends WebDialogStyles {
	/**
	 * The maximum width of a message dialog
	 * - The default style limits the message dialog width using the CSS `min()` function based on screen width and a fixed value.
	 */
	maxWidth: string | number = "min(95vw,28rem)";

	/**
	 * The cell style used for the block of messages
	 * - The default style only includes padding. A `DragModal` effect is applied to the container to use the cell as a grab handle for the entire dialog.
	 */
	messageCellStyle: UICell.StyleValue = ui.style.CELL.extend({
		padding: { top: 32, bottom: 24, x: 16 },
	});

	/**
	 * The cell style used for the block of buttons
	 * - The default style only includes padding.
	 */
	buttonCellStyle: UICell.StyleValue = ui.style.CELL.extend({
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
	 * Options for the layout of the row of buttons on narrow viewports
	 * - By default, buttons are stretched in a column (vertical axis) on narrow viewports to maximize the use of vertical space.
	 */
	narrowButtonRowLayout: UIContainer.Layout = {
		axis: "vertical",
		gravity: "stretch",
	};

	/**
	 * True if the buttons should be shown in reverse order
	 * - This property defaults to true, which means that the confirm button is displayed last. Set to false to display the confirm button first.
	 */
	reverseButtons = true;

	/**
	 * True if the buttons should be shown in reverse order on narrow viewports
	 * - This property defaults to false. Set to true to display the confirm button last.
	 */
	narrowReverseButtons = false;

	/**
	 * The label style used for the first message label
	 * - The default style includes centered, bold text, with a maximum width of 480 pixels.
	 */
	firstLabelStyle: UILabel.StyleValue = ui.style.LABEL.extend({
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
	labelStyle: UILabel.StyleValue = ui.style.LABEL.extend({
		textAlign: "center",
		maxWidth: 480,
		lineBreakMode: "pre-wrap",
		userSelect: true,
	});

	/** The amount of (vertical) space between labels */
	labelSpacing = 8;

	/**
	 * The button style used for all buttons except the confirm button
	 * - This property defaults to the default button style.
	 */
	buttonStyle: UIButton.StyleValue = ui.style.BUTTON;

	/**
	 * The button style used for the confirm button
	 * - This property defaults to the default primary button style.
	 */
	confirmButtonStyle: UIButton.StyleValue = ui.style.BUTTON_PRIMARY;
}

/** @internal Default modal message dialog view; shown asynchronously and resolves a promise */
export class MessageDialog
	extends UIComponent
	implements UITheme.AlertDialogController, UITheme.ConfirmDialogController
{
	static styles = new WebMessageDialogStyles();

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
		let narrow = !app.renderer?.viewport.col2;
		let styles = MessageDialog.styles;
		let messageLabels = this.options.messages.map((text, i) =>
			ui.label(String(text), {
				style: i ? styles.labelStyle : styles.firstLabelStyle,
			}),
		);
		let buttons = [
			ui.button({
				style: styles.confirmButtonStyle,
				label: this.confirmLabel,
				onClick: "+Confirm",
				requestFocus: true,
			}),
			ui.button({
				style: styles.buttonStyle,
				hidden: !this.otherLabel,
				label: this.otherLabel,
				onClick: "+Other",
			}),
			ui.button({
				style: styles.buttonStyle,
				hidden: !this.cancelLabel,
				label: this.cancelLabel,
				onClick: "+Cancel",
			}),
		];
		let reverse = narrow ? styles.narrowReverseButtons : styles.reverseButtons;
		if (reverse) buttons.reverse();
		return ui
			.cell(
				{
					accessibleRole: "alertdialog",
					margin: styles.margin,
					effect: styles.effect,
					style: ui.style(styles.containerStyle, {
						maxWidth: styles.maxWidth,
					}),
				},
				ui.cell(
					{
						effect: ui.effect("DragModal"),
						style: styles.messageCellStyle,
					},
					ui.column({ spacing: styles.labelSpacing }, ...messageLabels),
				),
				ui.cell(
					{ style: styles.buttonCellStyle },
					ui.row(
						{
							layout: narrow
								? styles.narrowButtonRowLayout
								: styles.buttonRowLayout,
						},
						...buttons,
					),
				),
			)
			.create();
	}
}
