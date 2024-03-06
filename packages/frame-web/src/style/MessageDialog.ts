import {
	MessageDialogOptions,
	RenderContext,
	StringConvertible,
	UICell,
	UIContainer,
	UITheme,
	UIVariant,
	ViewComposite,
	app,
	strf,
	ui,
} from "@desk-framework/frame-core";

/**
 * A class that defines the styles for the default modal message dialog view
 * - A default instance of this class is created, and can be modified in the {@link WebContextOptions} configuration callback passed to {@link useWebContext}.
 * - These styles are used by the default message dialog view referenced by the {@link UITheme} implementation — and therefore also by {@link GlobalContext.showAlertDialogAsync app.showAlertDialogAsync()} and {@link GlobalContext.showConfirmDialogAsync app.showConfirmDialogAsync()}.
 * - The default dialog view includes an outer container, a block of message labels, and a block of buttons.
 *
 * @see {@link WebContextOptions}
 * @see {@link UITheme.ModalControllerFactory}
 */
export class MessageDialogStyles {
	/**
	 * The cell variant (and style) used for the outer dialog container
	 * - The default style is based on `ui.style.CELL_BG` and includes properties for dimensions and border radius.
	 * - Margin is set to `auto` to center the dialog on the screen if possible.
	 * - An `Elevate` effect is applied to add a drop shadow to the dialog.
	 */
	containerVariant = new UIVariant(UICell, {
		accessibleRole: "alertdialog",
		margin: "auto",
		effect: ui.effect.ELEVATE,
		style: ui.style.CELL_BG.extend({
			width: "auto",
			minWidth: 360,
			maxWidth: "95vw",
			grow: 0,
			borderRadius: 12,
		}),
	});

	/**
	 * The cell variant used for the block of messages
	 * - The default style only includes padding. A `DragModal` effect is applied to the container to use the cell as a grab handle for the entire dialog.
	 */
	messageCellVariant = new UIVariant(UICell, {
		effect: ui.effect("DragModal"),
		style: ui.style.CELL.extend({
			padding: 16,
		}),
	});

	/**
	 * The cell variant used for the block of buttons
	 * - The default style includes properties for padding and background
	 */
	buttonCellVariant = new UIVariant(UICell, {
		style: ui.style.CELL.extend({
			padding: 16,
		}),
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
	firstLabelStyle = ui.style.LABEL.extend({
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
	labelStyle = ui.style.LABEL.extend({
		textAlign: "center",
		maxWidth: 480,
		lineBreakMode: "pre-wrap",
		userSelect: true,
	});

	/**
	 * The button style used for all buttons except the confirm button
	 * - This property defaults to the default button style.
	 */
	buttonStyle = ui.style.BUTTON;

	/**
	 * The button style used for the confirm button
	 * - This property defaults to the default primary button style.
	 */
	confirmButtonStyle = ui.style.BUTTON_PRIMARY;
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
		// return a promise that's resolved when one of the buttons is pressed
		return new Promise<{ confirmed: boolean; other?: boolean }>((r) => {
			app.render(this, {
				mode: "dialog",
				shade: true,
				transform: {
					show: ui.animation.SHOW_DIALOG,
					hide: ui.animation.HIDE_DIALOG,
				},
				...place,
			});
			this._resolve = (result) => {
				this.unlink();
				r(result);
			};
		});
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
			{ variant: MessageDialog.styles.containerVariant },
			ui.column(
				ui.cell(
					{ variant: MessageDialog.styles.messageCellVariant },
					ui.column(...messageLabels),
				),
				ui.cell(
					{ variant: MessageDialog.styles.buttonCellVariant },
					ui.row({ layout: MessageDialog.styles.buttonRowLayout }, ...buttons),
				),
			),
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
