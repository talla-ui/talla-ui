import {
	app,
	Binding,
	ModalFactory,
	RenderContext,
	RenderEffect,
	UI,
	UIContainer,
	View,
	ViewEvent,
	Widget,
} from "@talla-ui/core";

/** @internal Default modal dialog view; shown synchronously, removed when view is unlinked */
export class Dialog extends Widget implements ModalFactory.DialogController {
	/** Default dialog render effect, set from {@link WebContextOptions} */
	static dialogEffect?: RenderEffect.EffectName;

	static Container(): UIContainer.ContainerBuilder {
		return UI.Column()
			.accessibleRole("dialog")
			.layout({ clip: true })
			.style({
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
	}

	constructor(public dialogView: View) {
		super();
		dialogView.listen({
			unlinked: () => this.unlink(),
		});
	}

	protected override get body() {
		if (this._body) return this._body;
		this._body = Dialog.Container()
			.effect(Dialog.dialogEffect)
			.with(UI.Show(Binding.from(this.dialogView)))
			.build();
		return this._body;
	}
	private _body?: View;

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
			...place,
		});
	}
}
