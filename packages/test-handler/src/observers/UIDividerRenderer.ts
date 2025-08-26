import { RenderContext, UI, UIDivider } from "@talla-ui/core";
import { TestOutputElement } from "../TestOutputElement.js";
import { applyElementStyle, TestBaseObserver } from "./TestBaseObserver.js";

/** @internal */
export class UIDividerRenderer extends TestBaseObserver<UIDivider> {
	constructor(observed: UIDivider) {
		super(observed);
		this.observeProperties("lineColor", "lineWidth", "vertical");
	}

	getOutput() {
		let elt = new TestOutputElement("divider");
		let output = new RenderContext.Output(this.observed, elt);
		elt.output = output;
		return output;
	}

	updateContent() {}

	updateStyle(element: TestOutputElement) {
		let sep = this.observed;
		// NOTE: margin is ignored in test renderer
		applyElementStyle(element, [
			sep.style,
			{
				borderColor: sep.lineColor || UI.colors.divider,
				borderWidth: sep.lineWidth,
			},
			sep.position,
		]);
	}
}
