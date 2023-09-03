import { ManagedChangeEvent, RenderContext, UITextField } from "desk-frame";
import { TestOutputElement } from "../app/TestOutputElement.js";
import { TestRenderObserver } from "./TestRenderObserver.js";

/** @internal */
export class UITextFieldRenderer extends TestRenderObserver<UITextField> {
	override observe(observed: UITextField) {
		return super
			.observe(observed)
			.observePropertyAsync(
				"placeholder",
				"value",
				"textStyle",
				"decoration",
				"disabled",
				"shrinkwrap",
			);
	}

	protected override async handlePropertyChange(
		property: string,
		value: any,
		event?: ManagedChangeEvent,
	) {
		if (this.observed && this.element) {
			switch (property) {
				case "placeholder":
				case "value":
					// NOTE: ignoring field type and enter key hint here
					this.scheduleUpdate(this.element);
					return;
				case "textStyle":
				case "decoration":
				case "disabled":
				case "shrinkwrap":
					this.scheduleUpdate(undefined, this.element);
					return;
			}
		}
		await super.handlePropertyChange(property, value, event);
	}

	getOutput() {
		// NOTE: ignoring multiline flag here
		if (!this.observed) throw ReferenceError();
		let elt = new TestOutputElement("textfield");
		let output = new RenderContext.Output(this.observed, elt);
		elt.output = output;
		return output;
	}

	override handlePlatformEvent(
		name: TestOutputElement.PlatformEvent,
		data?: any,
	) {
		// update 'value' first, reflecting the element value
		if (this.element && this.observed) {
			this.observed.value = this.element.value || "";
		}

		super.handlePlatformEvent(name, data);
	}

	override updateStyle(element: TestOutputElement) {
		let textField = this.observed;
		if (!textField) return;

		// set disabled state
		element.disabled = textField.disabled;

		// set style objects
		super.updateStyle(
			element,
			{
				textStyle: textField.textStyle,
				decoration: textField.decoration,
			},
			textField.shrinkwrap,
		);
	}

	updateContent(element: TestOutputElement) {
		if (!this.observed) return;
		element.text = String(this.observed.placeholder || "");
		element.focusable = true;

		let value = this.observed.value;
		value = value == null ? "" : String(value);
		element.value = value;
	}
}
