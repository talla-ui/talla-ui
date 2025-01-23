import {
	$view,
	RenderContext,
	UITheme,
	View,
	ViewComposite,
	app,
	ui,
} from "@talla-ui/core";

/** @internal Limited implementation of a dialog controller */
export class TestDialog
	extends ViewComposite
	implements UITheme.DialogController
{
	constructor(public dialogView: View) {
		super();
	}

	protected override createView() {
		return ui
			.cell(
				ui.renderView({
					view: $view("dialogView"),
					onViewUnlinked: "DialogViewUnlinked",
				}),
			)
			.create();
	}

	onDialogViewUnlinked() {
		this.unlink();
	}

	show(place?: Partial<RenderContext.PlacementOptions>) {
		if (this.dialogView.isUnlinked()) return;
		app.render(this, { mode: "modal", ...place });
	}
}
