import {
	bound,
	strf,
	UIStyle,
	UIBorderlessButton,
	UICell,
	UIExpandedLabel,
	UILinkButton,
	UIParagraph,
	UIPrimaryButton,
	UISpacer,
	StringConvertible,
	UIRow,
	UITheme,
	UIList,
	UIColor,
	app,
	RenderContext,
	ViewComposite,
} from "desk-frame";

/** @internal Styles that should be added to the web theme to style alert dialogs */
export const alertDialogStyles = {
	AlertDialog: UIStyle.Cell.extend("AlertDialog", {
		decoration: {
			background: UIColor.Background,
			borderRadius: 4,
			dropShadow: 0.65,
		},
		position: { gravity: "center" },
		dimensions: { maxWidth: 400, width: "95vw", grow: 0 },
	}),
	AlertDialog_TitleBar: UIStyle.Row.extend("AlertDialog_TitleBar", {
		decoration: {
			background: UIColor.PrimaryBackground,
			textColor: UIColor.PrimaryBackground.text(),
		},
		dimensions: { height: 40 },
	}),
	AlertDialog_Title: UIStyle.Label.extend("AlertDialog_Title", {}),
	AlertDialog_ButtonRow: UIStyle.Row.extend("AlertDialog_ButtonRow", {
		containerLayout: { distribution: "end" },
		decoration: { padding: 0 },
	}),
	AlertDialog_CancelButton: UIStyle.LinkButton.extend(
		"AlertDialog_CancelButton",
		{
			dimensions: { grow: 0 },
		},
	),
	AlertDialog_ConfirmButton: UIStyle.PrimaryButton.extend(
		"AlertDialog_ConfirmButton",
		{
			dimensions: { grow: 0 },
		},
	),
};

/** View body preset for the dialog itself */
const DialogBody = UICell.with(
	{ style: "@AlertDialog" },
	UIRow.with(
		{
			spacing: 0,
			style: "@AlertDialog_TitleBar",
			hidden: bound("!title"),
			onMouseDown: "+DragContainer",
		},
		UISpacer.withWidth(16),
		UIExpandedLabel.withText(bound("title"), "@AlertDialog_Title"),
		UIBorderlessButton.with({
			position: { gravity: "center" },
			icon: "@Close",
			onClick: "+Cancel",
			iconSize: 18,
			iconColor: "currentColor",
			textStyle: { color: "inherit" },
			disableKeyboardFocus: true,
		}),
	),
	UICell.with(
		{ padding: 16 },
		UIList.with(
			{ items: bound("messages") },
			UIParagraph.withText(bound("item")),
		),
		UISpacer.withHeight(24),
		UIRow.with(
			{
				style: "@AlertDialog_ButtonRow",
			},
			UILinkButton.with({
				style: "@AlertDialog_CancelButton",
				shrinkwrap: "auto",
				hidden: bound("!cancelButtonLabel"),
				label: bound("cancelButtonLabel"),
				onClick: "+Cancel",
			}),
			UIPrimaryButton.with({
				style: "@AlertDialog_ConfirmButton",
				shrinkwrap: "auto",
				label: bound("confirmButtonLabel"),
				onClick: "+Confirm",
				requestFocus: true,
			}),
		),
	),
);

/** @internal Default modal message dialog view; shown asynchronously and resolves a promise */
export class AlertDialog
	extends ViewComposite
	implements
		UITheme.AlertDialogController,
		UITheme.ConfirmationDialogController
{
	constructor(
		confirmButtonLabel: StringConvertible = strf("Dismiss"),
		cancelButtonLabel?: StringConvertible,
	) {
		super();
		this.confirmButtonLabel = confirmButtonLabel;
		this.cancelButtonLabel = cancelButtonLabel;
	}

	/** Messages to be displayed */
	messages: StringConvertible[] = [];
	/** Dialog title */
	title?: StringConvertible;
	/** Label for the confirmation button */
	confirmButtonLabel: StringConvertible;
	/** Label for the cancellation button; if none specified, only the confirmation button will be displayed */
	cancelButtonLabel?: StringConvertible;

	setTitle(title: StringConvertible) {
		this.title = title;
		return this;
	}
	addMessage(message: StringConvertible) {
		this.messages.push(message);
		return this;
	}
	setButtonLabel(label: StringConvertible) {
		this.confirmButtonLabel = label;
		return this;
	}
	setConfirmButtonLabel(label: StringConvertible) {
		this.confirmButtonLabel = label;
		return this;
	}
	setCancelButtonLabel(label: StringConvertible) {
		this.cancelButtonLabel = label;
		return this;
	}

	async showAsync(place?: Partial<RenderContext.PlacementOptions>) {
		this.body = new DialogBody();
		let rendered = app.render(this, {
			mode: "dialog",
			shade: UITheme.getModalDialogShadeOpacity(),
			transform: {
				show: UITheme.getAnimation("show-dialog"),
				hide: UITheme.getAnimation("hide-dialog"),
			},
			...place,
		});

		// return a promise that's resolved when one of the buttons is pressed
		return new Promise<{ confirmed: boolean }>((r) => {
			this._resolve = (confirmed) => {
				rendered.removeAsync();
				r({ confirmed });
			};
		});
	}

	onConfirm() {
		this._resolve?.(true);
	}
	onCancel() {
		this._resolve?.(false);
	}
	onEscapeKeyPress() {
		this._resolve?.(false);
	}

	private _resolve?: (confirmed: boolean) => void;
}
