import { RenderContext, UITextField, ui } from "talla-ui";
import { TestOutputElement } from "../app/TestOutputElement.js";
import { TestBaseObserver, applyElementStyle } from "./TestBaseObserver.js";

/** @internal */
export class UITextFieldRenderer extends TestBaseObserver<UITextField> {
	constructor(observed: UITextField) {
		super(observed);
		this.observeProperties(
			"placeholder",
			"value",
			"disabled",
			"readOnly",
			"width",
			"style",
		);
	}

	protected override propertyChange(property: string, value: any) {
		if (!this.element) return;
		switch (property) {
			case "placeholder":
			case "value":
				this.scheduleUpdate(this.element);
				return;
			case "disabled":
			case "readOnly":
			case "width":
			case "style":
				this.scheduleUpdate(undefined, this.element);
				return;
		}
		super.propertyChange(property, value);
	}

	override handlePlatformEvent(
		name: TestOutputElement.PlatformEvent,
		data?: any,
	) {
		// update 'value' first, reflecting the element value
		if (this.element) {
			this.observed.value = this.element.value || "";
		}

		data.value = this.observed?.value;
		super.handlePlatformEvent(name, data);
	}

	getOutput() {
		// NOTE: ignoring multiline flag here
		let elt = new TestOutputElement("textfield");
		let output = new RenderContext.Output(this.observed, elt);
		elt.output = output;
		elt.focusable = true;
		return output;
	}

	override updateStyle(element: TestOutputElement) {
		let textField = this.observed;

		// set state
		element.disabled = textField.disabled;
		element.readOnly = textField.readOnly;

		// set styles
		applyElementStyle(element, [
			ui.style.TEXTFIELD,
			textField.style,
			textField.width !== undefined
				? { width: textField.width, minWidth: 0 }
				: undefined,
			textField.position,
		]);
	}

	updateContent(element: TestOutputElement) {
		element.text = String(this.observed.placeholder || "");

		let value = this.observed.value;
		value = value == null ? "" : String(value);
		element.value = value;
	}
}
