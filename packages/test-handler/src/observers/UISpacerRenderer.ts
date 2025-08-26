import { RenderContext, UISpacer } from "@talla-ui/core";
import { TestOutputElement } from "../TestOutputElement.js";
import { TestBaseObserver, applyElementStyle } from "./TestBaseObserver.js";

/** @internal */
export class UISpacerRenderer extends TestBaseObserver<UISpacer> {
	constructor(observed: UISpacer) {
		super(observed);
		// this.observeProperties();
	}

	getOutput() {
		let elt = new TestOutputElement("spacer");
		let output = new RenderContext.Output(this.observed, elt);
		elt.output = output;
		return output;
	}

	updateContent() {}

	override updateStyle(element: TestOutputElement) {
		let spacer = this.observed;
		applyElementStyle(element, [spacer.style, spacer.position]);
	}
}
