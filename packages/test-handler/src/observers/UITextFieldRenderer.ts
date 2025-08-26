import { RenderContext, UITextField, UI } from "@talla-ui/core";
import { TestOutputElement } from "../TestOutputElement.js";
import { TestBaseObserver, applyElementStyle } from "./TestBaseObserver.js";

const TEXTFIELD_STYLE = UI.styles.textfield.default;

/** @internal */
export class UITextFieldRenderer extends TestBaseObserver<UITextField> {
	constructor(observed: UITextField) {
		super(observed);
		this.observeProperties("placeholder", "value", "disabled", "readOnly");
	}

	protected override propertyChange(property: string, value: any) {
		if (!this.element) return;
		switch (property) {
			case "placeholder":
			case "value":
				return this.scheduleUpdate(this.element);
		}
		super.propertyChange(property, value);
	}

	override handlePlatformEvent(
		name: TestOutputElement.PlatformEvent,
		data?: any,
	) {
		if (this.observed?.disabled) return;

		// update 'value' first, reflecting the element value
		if (this.element) {
			let value = this.element.value || "";
			this.observed.value = this.observed.trim ? value.trim() : value;
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
		let textfield = this.observed;

		// set state
		element.disabled = textfield.disabled;
		element.readOnly = textfield.readOnly;

		// set styles
		applyElementStyle(element, [
			TEXTFIELD_STYLE,
			textfield.style,
			textfield.position,
		]);
	}

	updateContent(element: TestOutputElement) {
		element.text = String(this.observed.placeholder || "");

		let value = this.observed.value;
		value = value == null ? "" : String(value);
		element.value = value;
	}
}
