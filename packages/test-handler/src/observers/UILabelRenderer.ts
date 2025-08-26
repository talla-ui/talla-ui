import { RenderContext, UI, UILabel } from "@talla-ui/core";
import { TestOutputElement } from "../TestOutputElement.js";
import { TestBaseObserver, applyElementStyle } from "./TestBaseObserver.js";

const LABEL_STYLE = UI.styles.label.default;

/** @internal */
export class UILabelRenderer extends TestBaseObserver<UILabel> {
	constructor(observed: UILabel) {
		super(observed);
		this.observeProperties("text", "icon");
	}

	protected override propertyChange(property: string, value: any) {
		if (!this.element) return;
		switch (property) {
			case "text":
			case "icon":
				return this.scheduleUpdate(this.element);
		}
		super.propertyChange(property, value);
	}

	getOutput() {
		let elt = new TestOutputElement("label");
		let output = new RenderContext.Output(this.observed, elt);
		elt.output = output;
		if (this.observed.allowFocus || this.observed.allowKeyboardFocus)
			elt.focusable = true;
		return output;
	}

	override updateStyle(element: TestOutputElement) {
		let label = this.observed;
		applyElementStyle(element, [LABEL_STYLE, label.style, label.position]);
	}

	updateContent(element: TestOutputElement) {
		element.text = String(this.observed.text);
		element.icon = String(this.observed.icon || "");
	}
}
