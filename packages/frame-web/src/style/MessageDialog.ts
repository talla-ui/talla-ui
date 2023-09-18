import {
	MessageDialogOptions,
	RenderContext,
	StringConvertible,
	UIButton,
	UIButtonStyle,
	UICell,
	UICellStyle,
	UIColor,
	UIContainer,
	UILabel,
	UILabelStyle,
	UIParagraphLabelStyle,
	UIPrimaryButtonStyle,
	UIRow,
	UITheme,
	ViewComposite,
	app,
	strf,
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
	 * - The default style includes properties for dimensions,  background, border radius, and drop shadow
	 */
	ContainerStyle: UITheme.StyleClassType<UICellStyle> = UICellStyle.extend({
		background: UIColor["@pageBackground"],
		borderRadius: 12,
		dropShadow: 0.8,
		width: "auto",
		minWidth: 360,
		maxWidth: "95vw",
		grow: 0,
	});

	/**
	 * The cell style used for the block of messages
	 * - The default style only includes padding
	 */
	MessageCellStyle: UITheme.StyleClassType<UICellStyle> = UICellStyle.extend({
		padding: 16,
	});

	/**
	 * The cell style used for the block of buttons
	 * - The default style includes properties for padding and background
	 */
	ButtonCellStyle: UITheme.StyleClassType<UICellStyle> = UICellStyle.extend({
		background: UIColor["@background"],
		padding: 16,
	});

	/**
	 * The label style used for the first message label
	 * - The default style includes centered, bold text, with a maximum width of 480 pixels.
	 */
	FirstLabelStyle: UITheme.StyleClassType<UILabelStyle> =
		UIParagraphLabelStyle.extend({
			bold: true,
			textAlign: "center",
			maxWidth: 480,
			css: { cursor: "default" },
		});

	/**
	 * The label style used for all labels except the first
	 * - The default style includes centered text, with a maximum width of 480 pixels.
	 */
	LabelStyle: UITheme.StyleClassType<UILabelStyle> =
		UIParagraphLabelStyle.extend({
			textAlign: "center",
			maxWidth: 480,
			css: { cursor: "default" },
		});

	/**
	 * The button style used for all buttons except the confirm button
	 * - This property defaults to {@link UIButtonStyle} itself.
	 */
	ButtonStyle: UITheme.StyleClassType<UIButtonStyle> = UIButtonStyle;

	/**
	 * The button style used for the confirm button
	 * - This property defaults to {@link UIPrimaryButtonStyle} itself.
	 */
	ConfirmButtonStyle: UITheme.StyleClassType<UIButtonStyle> =
		UIPrimaryButtonStyle;

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
		let rendered = app.render(this, {
			mode: "dialog",
			shade: UITheme.getModalDialogShadeOpacity(),
			transform: {
				show: "@show-dialog",
				hide: "@hide-dialog",
			},
			...place,
		});

		// return a promise that's resolved when one of the buttons is pressed
		return new Promise<{ confirmed: boolean; other?: boolean }>((r) => {
			this._resolve = (result) => {
				rendered.removeAsync();
				r(result);
			};
		});
	}

	protected override createView() {
		let messageLabels = this.options.messages.map((text, i) =>
			UILabel.with({
				labelStyle: i
					? MessageDialog.styles.LabelStyle
					: MessageDialog.styles.FirstLabelStyle,
				text,
			}),
		);
		let buttons = [
			UIButton.with({
				buttonStyle: MessageDialog.styles.ConfirmButtonStyle,
				label: this.confirmLabel,
				onClick: "+Confirm",
				requestFocus: true,
			}),
			UIButton.with({
				buttonStyle: MessageDialog.styles.ButtonStyle,
				hidden: !this.otherLabel,
				label: this.otherLabel,
				onClick: "+Other",
			}),
			UIButton.with({
				buttonStyle: MessageDialog.styles.ButtonStyle,
				hidden: !this.cancelLabel,
				label: this.cancelLabel,
				onClick: "+Cancel",
			}),
		];
		if (MessageDialog.styles.reverseButtons) buttons.reverse();
		return new (UICell.with(
			{
				cellStyle: MessageDialog.styles.ContainerStyle,
				position: { gravity: "center" },
				accessibleRole: "alertdialog",
			},
			UICell.with(
				{
					cellStyle: MessageDialog.styles.MessageCellStyle,
					onMouseDown: "+DragContainer",
				},
				...messageLabels,
			),
			UICell.with(
				{
					cellStyle: MessageDialog.styles.ButtonCellStyle,
				},
				UIRow.with(
					{ layout: MessageDialog.styles.buttonRowLayout },
					...buttons,
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
