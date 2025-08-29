import {
	AppContext,
	CustomView,
	RenderContext,
	UI,
	View,
	app,
	bind,
} from "@talla-ui/core";

/** @internal Limited implementation of a dialog controller */
export class TestDialog
	extends CustomView
	implements AppContext.DialogController
{
	constructor(public dialogView: View) {
		super();
		dialogView.listen({
			unlinked: () => this.unlink(),
		});
	}

	protected override defineView() {
		return UI.Cell(UI.Show(bind("dialogView")));
	}

	show(place?: Partial<RenderContext.PlacementOptions>) {
		if (this.dialogView.isUnlinked()) return;
		app.render(this, { mode: "modal", ...place });
	}
}
