import {
	RenderContext,
	UICell,
	UICellStyle,
	UIColor,
	UIComponent,
	UITheme,
	UIViewRenderer,
	View,
	ViewComposite,
	app,
	bound,
} from "@desk-framework/frame-core";

/**
 * A class that defines the styles for the default modal dialog view
 * - A default instance of this class is created, and can be modified in the {@link WebContextOptions} configuration callback passed to {@link useWebContext}.
 * - These styles are used by the default message dialog view referenced by the {@link UITheme} implementation — and therefore also by {@link GlobalContext.showAlertDialogAsync app.showAlertDialogAsync()} and {@link GlobalContext.showConfirmDialogAsync app.showConfirmDialogAsync()}.
 */
export class DialogStyles {
	/**
	 * The cell style used for the outer dialog container
	 * - The default style includes properties for dimensions, background, border radius, and drop shadow
	 */
	ContainerStyle: UITheme.StyleClassType<UICellStyle> = UICellStyle.extend({
		background: UIColor["@pageBackground"],
		borderRadius: 12,
		dropShadow: 0.8,
		width: "auto",
		minWidth: 360,
		grow: 0,
	});

	/** The margin that is applied to the outer dialog container, to position the dialog itself */
	margin: UIComponent.Offsets = "auto";
}

/** @internal Default modal dialog view; shown synchronously, removed when view is unlinked */
export class Dialog extends ViewComposite implements UITheme.DialogController {
	static styles = new DialogStyles();

	constructor(public dialogView: View) {
		super();
	}

	protected override createView() {
		return new (UICell.with(
			{
				cellStyle: Dialog.styles.ContainerStyle,
				margin: Dialog.styles.margin,
			},
			UIViewRenderer.with({
				view: bound("dialogView"),
				onViewUnlinked: "DialogViewUnlinked",
			}),
		))();
	}

	onDialogViewUnlinked() {
		this.unlink();
	}

	show(place?: Partial<RenderContext.PlacementOptions>) {
		if (this.dialogView.isUnlinked()) return;
		app.render(this, {
			mode: "dialog",
			shade: UITheme.getModalDialogShadeOpacity(),
			transform: {
				show: "@show-dialog",
				hide: "@hide-dialog",
			},
			...place,
		});
	}
}
