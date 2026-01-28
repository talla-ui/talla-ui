import { Binding, UI, View, Widget } from "@talla-ui/core";
import icons from "../icons";

export function getViewForElement(elt?: Element | null) {
	while (elt) {
		for (let p in elt) {
			if (p.startsWith("Web__Handler_")) {
				let view = (elt as any)[p].observed;
				if (view instanceof View) return view;
			}
		}
		elt = elt.parentElement as any;
	}
}

const BodyView = () =>
	UI.Column(
		UI.Column()
			.effect("drag-modal", true)
			.hideWhen(
				new Binding("docked"), // from MainOverlayView
			)
			.stretch()
			.center(),
		UI.Column(
			UI.Image(icons.selectElement).size(32).fg(UI.colors.blue),
			UI.Spacer(16),
			UI.Text("Select a view to inspect").dim(),
		).align("center"),
		UI.Column()
			.hideWhen(new Binding("docked"))
			.effect("drag-modal", true)
			.stretch()
			.center(),
	)
		.stretch()
		.center();

export class ViewPickerPanelView extends Widget {
	protected override get body() {
		return BodyView().build();
	}

	protected override beforeRender() {
		this._mouseHandler = this.handleMouseEvent.bind(this);
		this.registerHandlers();
	}

	protected override beforeUnlink() {
		this.stopHandlers();
	}

	protected registerHandlers() {
		window.addEventListener("mousemove", this._mouseHandler as any);
		window.addEventListener("mousedown", this._mouseHandler as any, true);
		window.addEventListener("mouseup", this._mouseHandler as any, true);
		window.addEventListener("click", this._mouseHandler as any, true);
	}

	protected stopHandlers() {
		window.removeEventListener("mousemove", this._mouseHandler as any);
		window.removeEventListener("mousedown", this._mouseHandler as any, true);
		window.removeEventListener("mouseup", this._mouseHandler as any, true);
		window.removeEventListener("click", this._mouseHandler as any, true);
	}

	protected handleMouseEvent(e: MouseEvent) {
		// find out which element is under the mouse
		let elt: any = document.elementFromPoint(e.clientX, e.clientY);
		let parentElt = elt;
		while (parentElt) {
			if (parentElt.dataset.name?.startsWith("WebTools")) return;
			parentElt = parentElt.parentElement;
		}
		e.preventDefault();
		e.stopPropagation();
		let view = getViewForElement(elt);
		if (view) {
			(document.activeElement as HTMLElement)?.blur?.();
			this.emit("HighlightView", { view });
			if (e.type === "mousedown") {
				this.emit("InspectObject", { object: view });
			}
			if (e.type === "click") {
				this.stopHandlers();
				this.emit("InspectObject", { object: view });
				this.emit("ClearPicker");
			}
			return false;
		}
	}

	private _mouseHandler?: Function;
}
