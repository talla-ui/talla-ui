import {
	app,
	Binding,
	ComponentView,
	ModalFactory,
	RenderContext,
	UI,
	UIContainer,
	UIStyle,
	View,
	ViewEvent,
} from "@talla-ui/core";

/** @internal Default modal dialog view; shown synchronously, removed when view is unlinked */
export class Dialog
	extends ComponentView
	implements ModalFactory.DialogController
{
	static containerStyle = new UIStyle({
		background: UI.colors.background,
		borderColor: UI.colors.text.alpha(0.2),
		borderWidth: 1,
		margin: "auto",
		width: "auto",
		minWidth: 320,
		maxWidth: "100vw",
		grow: 0,
		borderRadius: 12,
		dropShadow: 32,
	});

	static Container(): UIContainer.ContainerBuilder {
		return UI.Cell().accessibleRole("dialog").style(Dialog.containerStyle);
	}

	constructor(public dialogView: View) {
		super();
		dialogView.listen({
			unlinked: () => this.unlink(),
		});
	}

	protected override get body() {
		return Dialog.Container()
			.with(UI.Show(Binding.from(this.dialogView)))
			.build();
	}

	onKeyDown(e: ViewEvent) {
		if (e.data.key === "Escape" && e.source === this.body) {
			// redirect escape key press on modal shader to inner view
			this.dialogView?.emit("KeyDown", e.data);
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
