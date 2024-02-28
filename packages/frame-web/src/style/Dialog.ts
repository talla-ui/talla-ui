import {
	RenderContext,
	UIComponent,
	UITheme,
	View,
	ViewComposite,
	app,
	bound,
	ui,
} from "@desk-framework/frame-core";

/**
 * A class that defines the styles for the default modal dialog view
 * - A default instance of this class is created, and can be modified in the {@link WebContextOptions} configuration callback passed to {@link useWebContext}.
 * - These styles are used by the default message dialog view referenced by the {@link UITheme} implementation — and therefore also by {@link GlobalContext.showAlertDialogAsync app.showAlertDialogAsync()} and {@link GlobalContext.showConfirmDialogAsync app.showConfirmDialogAsync()}.
 */
export class DialogStyles {
	/**
	 * The cell style used for the outer dialog container
	 * - The default style is based on `ui.style.CELL_BG` and includes properties for dimensions and border radius
	 */
	ContainerStyle = ui.style.CELL_BG.extend({
		width: "auto",
		minWidth: 360,
		grow: 0,
		borderRadius: 12,
	});

	/**
	 * The margin that is set on the outer dialog container, to position the dialog on the screen
	 * - By default, the dialog is centered on the screen using `auto` margins all around
	 */
	margin: UIComponent.Offsets = "auto";

	/** The output effect that is applied to the outer dialog container, defaults to Elevate */
	effect: RenderContext.OutputEffect = ui.effect.ELEVATE;
}

/** @internal Default modal dialog view; shown synchronously, removed when view is unlinked */
export class Dialog extends ViewComposite implements UITheme.DialogController {
	static styles = new DialogStyles();

	constructor(public dialogView: View) {
		super();
	}

	protected override createView() {
		return new (ui.cell(
			{
				style: Dialog.styles.ContainerStyle,
				margin: Dialog.styles.margin,
				effect: Dialog.styles.effect,
			},
			ui.renderView({
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
			shade: true,
			transform: {
				show: ui.animation.SHOW_DIALOG,
				hide: ui.animation.HIDE_DIALOG,
			},
			...place,
		});
	}
}
