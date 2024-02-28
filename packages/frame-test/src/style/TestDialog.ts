import {
	RenderContext,
	UITheme,
	View,
	ViewComposite,
	app,
	bound,
	ui,
} from "@desk-framework/frame-core";

/** @internal Limited implementation of a dialog controller */
export class TestDialog
	extends ViewComposite
	implements UITheme.DialogController
{
	constructor(public dialogView: View) {
		super();
	}

	protected override createView() {
		return new (ui.cell(
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
		app.render(this, { mode: "dialog", ...place });
	}
}
