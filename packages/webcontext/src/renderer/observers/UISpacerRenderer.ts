import { RenderContext, UISpacer } from "desk-frame";
import { BaseObserver } from "./BaseObserver.js";

/** @internal */
export class UISpacerRenderer extends BaseObserver<UISpacer> {
	getOutput() {
		if (!this.observed) throw ReferenceError();
		let elt = document.createElement("spacer" as string);
		let output = new RenderContext.Output(this.observed, elt);
		return output;
	}

	updateContent(element: HTMLElement) {}

	override updateStyle(element: HTMLElement) {
		if (this.observed) {
			super.updateStyle(element, undefined, this.observed.shrinkwrap);
		}
	}
}
