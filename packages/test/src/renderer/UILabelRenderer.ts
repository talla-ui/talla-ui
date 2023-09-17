import {
	ManagedChangeEvent,
	RenderContext,
	UILabel,
	UILabelStyle,
} from "desk-frame";
import { TestOutputElement } from "../app/TestOutputElement.js";
import {
	TestBaseObserver,
	applyElementStyle,
	getBaseStyleClass,
} from "./TestBaseObserver.js";

/** @internal */
export class UILabelRenderer extends TestBaseObserver<UILabel> {
	override observe(observed: UILabel) {
		return super
			.observe(observed)
			.observePropertyAsync(
				"text",
				"icon",
				"bold",
				"italic",
				"color",
				"width",
				"labelStyle",
			);
	}

	protected override async handlePropertyChange(
		property: string,
		value: any,
		event?: ManagedChangeEvent,
	) {
		if (this.observed && this.element) {
			switch (property) {
				case "text":
				case "icon":
					this.scheduleUpdate(this.element);
					return;
				case "bold":
				case "italic":
				case "color":
				case "width":
				case "labelStyle":
					this.scheduleUpdate(undefined, this.element);
					return;
			}
		}
		await super.handlePropertyChange(property, value, event);
	}

	getOutput() {
		if (!this.observed) throw ReferenceError();
		let elt = new TestOutputElement("label");
		let output = new RenderContext.Output(this.observed, elt);
		elt.output = output;
		if (this.observed.allowFocus || this.observed.allowKeyboardFocus)
			elt.focusable = true;
		return output;
	}

	override updateStyle(element: TestOutputElement) {
		let label = this.observed;
		if (label) {
			element.styleClass = getBaseStyleClass(label.labelStyle) || UILabelStyle;
			applyElementStyle(
				element,
				[
					label.labelStyle,
					{
						width: label.width,
						bold: label.bold,
						italic: label.italic,
						textColor: label.color,
					},
				],
				label.position,
			);
		}
	}

	updateContent(element: TestOutputElement) {
		if (!this.observed) return;
		element.text = String(this.observed.text);
		element.icon = String(this.observed.icon);
	}
}
