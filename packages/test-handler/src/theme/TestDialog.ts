import {
	$view,
	RenderContext,
	UITheme,
	View,
	UIComponent,
	app,
	ui,
} from "@talla-ui/core";

/** @internal Limited implementation of a dialog controller */
export class TestDialog
	extends UIComponent
	implements UITheme.DialogController
{
	constructor(public dialogView: View) {
		super();
		dialogView.listen({
			unlinked: () => this.unlink(),
		});
	}

	protected override createView() {
		return ui
			.cell(
				ui.show({
					insert: $view("dialogView"),
				}),
			)
			.create();
	}

	show(place?: Partial<RenderContext.PlacementOptions>) {
		if (this.dialogView.isUnlinked()) return;
		app.render(this, { mode: "modal", ...place });
	}
}
