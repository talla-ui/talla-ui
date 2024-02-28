import {
	MessageDialogOptions,
	RenderContext,
	StringConvertible,
	UIComponent,
	UIContainer,
	UITheme,
	ViewComposite,
	app,
	strf,
	ui,
} from "@desk-framework/frame-core";

/**
 * A class that defines the styles for the default modal message dialog view
 * - A default instance of this class is created, and can be modified in the {@link WebContextOptions} configuration callback passed to {@link useWebContext}.
 * - These styles are used by the default message dialog view referenced by the {@link UITheme} implementation — and therefore also by {@link GlobalContext.showAlertDialogAsync app.showAlertDialogAsync()} and {@link GlobalContext.showConfirmDialogAsync app.showConfirmDialogAsync()}.
 * - The default dialog view includes an outer container, a block of message labels, and a block of buttons. These can be customized using {@link ContainerStyle}, {@link MessageCellStyle}, and {@link ButtonCellStyle}, respectively.
 *
 * @see {@link WebContextOptions}
 * @see {@link UITheme.ModalControllerFactory}
 *
 * @example
 * useWebContext((options) => {
 * options.messageDialogStyles.ContainerStyle =
 *   options.messageDialogStyles.ContainerStyle.extend({
 *     width: 320,
 *   });
 * options.messageDialogStyles.ButtonCellStyle =
 *   options.messageDialogStyles.ButtonCellStyle.extend({
 *     padding: { x: 32, y: 24 },
 *   });
 * });
 * options.messageDialogStyles.buttonRowLayout = {
 *   axis: "vertical",
 *   gravity: "stretch",
 *   separator: { space: 8 },
 * };
 * options.messageDialogStyles.reverseButtons = false;
 */
export class MessageDialogStyles {
	/**
	 * The cell style used for the outer dialog container
	 * - The default style includes properties for dimensions, background, border radius, and drop shadow
	 */
	ContainerStyle = ui.style.CELL_BG.extend({
		width: "auto",
		minWidth: 360,
		maxWidth: "95vw",
		borderRadius: 12,
		grow: 0,
	});

	/**
	 * The margin that is set on the outer dialog container, to position the dialog on the screen
	 * - By default, the dialog is centered on the screen using `auto` margins all around
	 */
	margin: UIComponent.Offsets = "auto";

	/** The output effect that is applied to the outer dialog container, defaults to Elevate */
	effect: RenderContext.OutputEffect = ui.effect.ELEVATE;

	/**
	 * The cell style used for the block of messages
	 * - The default style only includes padding
	 */
	MessageCellStyle = ui.style.CELL.extend({
		padding: 16,
	});

	/**
	 * The cell style used for the block of buttons
	 * - The default style includes properties for padding and background
	 */
	ButtonCellStyle = ui.style.CELL.extend({
		padding: 16,
	});

	/**
	 * The label style used for the first message label
	 * - The default style includes centered, bold text, with a maximum width of 480 pixels.
	 */
	FirstLabelStyle = ui.style.LABEL.extend({
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
	LabelStyle = ui.style.LABEL.extend({
		textAlign: "center",
		maxWidth: 480,
		lineBreakMode: "pre-wrap",
		userSelect: true,
	});

	/**
	 * The button style used for all buttons except the confirm button
	 * - This property defaults to the default button style.
	 */
	ButtonStyle = ui.style.BUTTON;

	/**
	 * The button style used for the confirm button
	 * - This property defaults to the default primary button style.
	 */
	ConfirmButtonStyle = ui.style.BUTTON_PRIMARY;

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
			ui.label({
				style: i
					? MessageDialog.styles.LabelStyle
					: MessageDialog.styles.FirstLabelStyle,
				text,
			}),
		);
		let buttons = [
			ui.button({
				style: MessageDialog.styles.ConfirmButtonStyle,
				label: this.confirmLabel,
				onClick: "+Confirm",
				requestFocus: true,
			}),
			ui.button({
				style: MessageDialog.styles.ButtonStyle,
				hidden: !this.otherLabel,
				label: this.otherLabel,
				onClick: "+Other",
			}),
			ui.button({
				style: MessageDialog.styles.ButtonStyle,
				hidden: !this.cancelLabel,
				label: this.cancelLabel,
				onClick: "+Cancel",
			}),
		];
		if (MessageDialog.styles.reverseButtons) buttons.reverse();
		return new (ui.cell(
			{
				style: MessageDialog.styles.ContainerStyle,
				margin: MessageDialog.styles.margin,
				effect: MessageDialog.styles.effect,
				accessibleRole: "alertdialog",
			},
			ui.column(
				ui.cell(
					{
						style: MessageDialog.styles.MessageCellStyle,
						effect: ui.effect("DragModal"),
					},
					ui.column(...messageLabels),
				),
				ui.cell(
					{
						style: MessageDialog.styles.ButtonCellStyle,
					},
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
