import {
	RenderContext,
	UICell,
	UITheme,
	UIViewRenderer,
	View,
	ViewComposite,
	app,
	bound,
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
		return new (UICell.with(
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
		app.render(this, { mode: "dialog", ...place });
	}
}
