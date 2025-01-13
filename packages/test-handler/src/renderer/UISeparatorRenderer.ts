import { RenderContext, UISeparator } from "@talla-ui/core";
import { TestOutputElement } from "../app/TestOutputElement.js";
import { TestBaseObserver, applyElementStyle } from "./TestBaseObserver.js";

/** @internal */
export class UISeparatorRenderer extends TestBaseObserver<UISeparator> {
	constructor(observed: UISeparator) {
		super(observed);
		this.observeProperties("color", "margin", "thickness");
	}

	protected override propertyChange(property: string, value: any) {
		if (!this.element) return;
		switch (property) {
			case "color":
			case "margin":
			case "thickness":
				this.scheduleUpdate(undefined, this.element);
				return;
		}
		super.propertyChange(property, value);
	}

	getOutput() {
		let elt = new TestOutputElement("separator");
		let output = new RenderContext.Output(this.observed, elt);
		elt.output = output;
		return output;
	}

	updateContent() {}

	updateStyle(element: TestOutputElement) {
		let sep = this.observed;
		// NOTE: margin is ignored in test renderer
		applyElementStyle(element, [
			{
				borderColor: sep.color,
				borderThickness: sep.thickness,
			},
			sep.position,
		]);
	}
}
