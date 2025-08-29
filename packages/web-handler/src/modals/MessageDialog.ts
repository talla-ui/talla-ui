import {
	app,
	CustomView,
	MessageDialogOptions,
	ModalFactory,
	RenderContext,
	UI,
	UIContainer,
	UIStyle,
} from "@talla-ui/core";
import { fmt, StringConvertible } from "@talla-ui/util";
import { applyDragModal } from "../drag/modal.js";
import { Dialog, WebDialogStyles } from "./Dialog.js";

/**
 * A class that defines the styles for the default modal message dialog view
 * - A default instance of this class is created, and can be modified in the {@link WebContextOptions} configuration callback passed to {@link useWebContext}.
 * - These styles are used by the default message dialog view, created by {@link AppContext.showAlertDialogAsync app.showAlertDialogAsync()} and {@link AppContext.showConfirmDialogAsync app.showConfirmDialogAsync()}.
 * - The default dialog view includes an outer container, a block of message labels, and a block of buttons.
 *
 * @see {@link WebContextOptions}
 * @see {@link ModalFactory}
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
	messageCellStyle = new UIStyle({
		padding: { top: 32, bottom: 24, x: 16 },
	});

	/**
	 * The cell style used for the block of buttons
	 * - The default style only includes padding.
	 */
	buttonCellStyle = new UIStyle({
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
	firstLabelStyle = UI.styles.label.default.extend({
		bold: true,
		textAlign: "center",
		maxWidth: 480,
		lineBreakMode: "pre-wrap",
		userTextSelect: true,
	});

	/**
	 * The label style used for all labels except the first
	 * - The default style includes centered text, with a maximum width of 480 pixels.
	 */
	labelStyle = UI.styles.label.default.extend({
		textAlign: "center",
		maxWidth: 480,
		lineBreakMode: "pre-wrap",
		userTextSelect: true,
	});

	/** The amount of (vertical) space between labels */
	labelGap = 8;

	/**
	 * The button style used for all buttons except the confirm button
	 * - This property defaults to the default button style.
	 */
	buttonStyle = UI.styles.button.default;

	/**
	 * The button style used for the confirm button
	 * - This property defaults to the default primary button style.
	 */
	confirmButtonStyle = UI.styles.button.primary;
}

/** @internal Default modal message dialog view; shown asynchronously and resolves a promise */
export class MessageDialog
	extends CustomView
	implements
		ModalFactory.AlertDialogController,
		ModalFactory.ConfirmDialogController
{
	static styles = new WebMessageDialogStyles();

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
		app.render(this, {
			mode: "modal",
			shade: true,
			transform: {
				show: UI.animations.showDialog,
				hide: UI.animations.hideDialog,
			},
			...place,
		});
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

	protected override defineView() {
		let narrow = app.viewport?.cols! < 2;
		let styles = MessageDialog.styles;
		let messageLabels = this.options.messages.map((text, i) =>
			UI.Label(String(text)).labelStyle(
				i ? styles.labelStyle : styles.firstLabelStyle,
			),
		);
		let buttons = [
			UI.Button(this.confirmLabel)
				.emit("Confirm")
				.buttonStyle(styles.confirmButtonStyle)
				.requestFocus(),
			UI.Button(this.otherLabel)
				.emit("Other")
				.buttonStyle(styles.buttonStyle)
				.hideWhen(!this.otherLabel),
			UI.Button(this.cancelLabel)
				.emit("Cancel")
				.buttonStyle(styles.buttonStyle)
				.hideWhen(!this.cancelLabel),
		];
		let reverse = narrow ? styles.narrowReverseButtons : styles.reverseButtons;
		if (reverse) buttons.reverse();
		return UI.Cell()
			.style(Dialog.styles.containerStyle)
			.maxWidth(styles.maxWidth)
			.accessibleRole("alertdialog")
			.with(
				applyDragModal(
					UI.Cell()
						.style(styles.messageCellStyle)
						.with(UI.Column(...messageLabels).gap(styles.labelGap)),
				),
				UI.Cell()
					.style(styles.buttonCellStyle)
					.with(
						UI.Row(...buttons).layout(
							narrow ? styles.narrowButtonRowLayout : styles.buttonRowLayout,
						),
					),
			);
	}
}
