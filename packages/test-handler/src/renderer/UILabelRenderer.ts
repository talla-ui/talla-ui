import { RenderContext, UILabel, ui } from "@talla-ui/core";
import { TestOutputElement } from "../app/TestOutputElement.js";
import { TestBaseObserver, applyElementStyle } from "./TestBaseObserver.js";

/** @internal */
export class UILabelRenderer extends TestBaseObserver<UILabel> {
	constructor(observed: UILabel) {
		super(observed);
		this.observeProperties(
			"text",
			"icon",
			"bold",
			"italic",
			"color",
			"padding",
			"width",
			"dim",
			"style",
		);
	}

	protected override propertyChange(property: string, value: any) {
		if (!this.element) return;
		switch (property) {
			case "text":
			case "icon":
				this.scheduleUpdate(this.element);
				return;
			case "bold":
			case "italic":
			case "color":
			case "dim":
			case "width":
			case "padding":
			case "style":
				this.scheduleUpdate(undefined, this.element);
				return;
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
		applyElementStyle(element, [
			ui.style.LABEL,
			label.style,
			{
				width: label.width,
				padding: label.padding,
				bold: label.bold,
				italic: label.italic,
				textColor: label.color,
				fontSize: label.fontSize,
				opacity: label.dim === true ? 0.5 : label.dim === false ? 1 : label.dim,
				lineBreakMode: label.wrap ? "pre-wrap" : undefined,
				userSelect: label.selectable || undefined,
			},
			label.position,
		]);
	}

	updateContent(element: TestOutputElement) {
		element.text = String(this.observed.text);
		element.icon = String(this.observed.icon || "");
	}
}
