import {
	app,
	AppContext,
	bind,
	ComponentView,
	RenderContext,
	UI,
	UICell,
	UIStyle,
	View,
	ViewEvent,
} from "@talla-ui/core";
import { ConfigOptions } from "@talla-ui/util";

/** Default modal dialog view styles */
export class WebDialogStyles extends ConfigOptions {
	/** The style used for the dialog container */
	containerStyle = new UIStyle({
		background: UI.colors.background,
		borderColor: UI.colors.text.alpha(0.2),
		borderWidth: 1,
		margin: "auto",
		width: "auto",
		minWidth: 320,
		maxWidth: "100vw",
		grow: 0,
		borderRadius: 12,
		dropShadow: 16,
	});

	/** A variant modifier for the dialog container, applies the container style by default */
	containerModifier = (cell: UICell.CellBuilder) =>
		cell.style(this.containerStyle);
}

/** @internal Default modal dialog view; shown synchronously, removed when view is unlinked */
export class Dialog
	extends ComponentView
	implements AppContext.DialogController
{
	static styles = new WebDialogStyles();

	constructor(public dialogView: View) {
		super();
		dialogView.listen({
			unlinked: () => this.unlink(),
		});
	}

	protected override get body() {
		return UI.Cell(UI.Show(bind("dialogView")))
			.apply(Dialog.styles.containerModifier)
			.create();
	}

	onEscapeKeyPress(e: ViewEvent) {
		if (e.source === this.body) {
			// redirect escape key press on modal shader to inner view
			this.dialogView?.emit("EscapeKeyPress", e.data);
		}
	}

	show(place?: Partial<RenderContext.PlacementOptions>) {
		if (this.dialogView.isUnlinked()) return;
		app.render(this, {
			mode: "modal",
			shade: true,
			transform: {
				show: UI.animations.showDialog,
				hide: UI.animations.hideDialog,
			},
			...place,
		});
	}
}
