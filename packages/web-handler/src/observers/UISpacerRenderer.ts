import { RenderContext, UISpacer } from "@talla-ui/core";
import { applyStyles } from "../DOMStyle.js";
import { BaseObserver } from "./BaseObserver.js";

/** @internal */
export class UISpacerRenderer extends BaseObserver<UISpacer> {
	getOutput() {
		let elt = document.createElement("spacer" as string);
		let output = new RenderContext.Output(this.observed, elt);
		return output;
	}

	updateContent() {}

	override updateStyle(element: HTMLElement) {
		let spacer = this.observed;
		applyStyles(
			element,
			[spacer.style],
			undefined,
			false,
			false,
			spacer.position,
		);
	}
}
