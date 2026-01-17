import {
	app,
	Binding,
	ModalFactory,
	RenderContext,
	UI,
	View,
	Widget,
} from "@talla-ui/core";

/** @internal Limited implementation of a dialog controller */
export class TestDialog
	extends Widget
	implements ModalFactory.DialogController
{
	constructor(public dialogView: View) {
		super();
		dialogView.listen({
			unlinked: () => this.unlink(),
		});
	}

	protected override get body() {
		return UI.Cell(UI.Show(Binding.from(this.dialogView))).build();
	}

	show(place?: Partial<RenderContext.PlacementOptions>) {
		if (this.dialogView.isUnlinked()) return;
		app.render(this, { mode: "modal", ...place });
	}
}
