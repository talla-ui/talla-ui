import { RenderContext, UI, UIText } from "@talla-ui/core";
import { TestOutputElement } from "../TestOutputElement.js";
import { TestBaseObserver, applyElementStyle } from "./TestBaseObserver.js";

const TEXT_STYLE = UI.styles.text.default;

/** @internal */
export class UITextRenderer extends TestBaseObserver<UIText> {
	constructor(observed: UIText) {
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
		let elt = new TestOutputElement("text");
		let output = new RenderContext.Output(this.observed, elt);
		elt.output = output;
		if (this.observed.allowFocus || this.observed.allowKeyboardFocus)
			elt.focusable = true;
		return output;
	}

	override updateStyle(element: TestOutputElement) {
		let text = this.observed;
		applyElementStyle(element, [TEXT_STYLE, text.style, text.position]);
	}

	updateContent(element: TestOutputElement) {
		element.text = String(this.observed.text);
		element.icon = String(this.observed.icon || "");
	}
}
