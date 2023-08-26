import { RenderContext, UISpacer } from "desk-frame";
import { TestOutputElement } from "../app/TestOutputElement.js";
import { TestRenderObserver } from "./TestRenderObserver.js";

/** @internal */
export class UISpacerRenderer extends TestRenderObserver<UISpacer> {
	getOutput() {
		if (!this.observed) throw ReferenceError();
		let elt = new TestOutputElement("spacer");
		let output = new RenderContext.Output(this.observed, elt);
		elt.output = output;
		return output;
	}

	updateContent(_element: TestOutputElement) {
		// do nothing
	}
}
