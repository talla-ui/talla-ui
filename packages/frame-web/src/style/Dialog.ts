import {
	RenderContext,
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
 * - These styles are used for dialog views created by activities with the {@link Activity.Options.showDialog} option enabled. Note that message dialog styles are configured separately using {@link MessageDialogStyles}.
 */
export class DialogStyles {
	/** The margin around the outer dialog container, to change its position on screen, defaults to `auto` */
	margin: string | number = "auto";

	/** The effect that's applied to the container, defaults to `Elevate` */
	effect = ui.effect.ELEVATE;

	/**
	 * The cell style that's applied to the outer dialog container
	 * - The default style is based on `ui.style.CELL_BG` and includes properties for dimensions and border radius.
	 */
	containerStyle: ui.CellStyle = ui.style.CELL_BG.extend({
		width: "auto",
		minWidth: 360,
		maxWidth: "100vw",
		grow: 0,
		borderRadius: 12,
	});
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
				margin: Dialog.styles.margin,
				effect: Dialog.styles.effect,
				style: Dialog.styles.containerStyle,
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
			mode: "modal",
			shade: true,
			transform: {
				show: ui.animation.SHOW_DIALOG,
				hide: ui.animation.HIDE_DIALOG,
			},
			...place,
		});
	}
}
