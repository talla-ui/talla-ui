import {
	ManagedChangeEvent,
	RenderContext,
	UITextField,
	ui,
} from "@desk-framework/frame-core";
import { TestOutputElement } from "../app/TestOutputElement.js";
import {
	TestBaseObserver,
	applyElementStyle,
	getBaseStyleClass,
} from "./TestBaseObserver.js";

/** @internal */
export class UITextFieldRenderer extends TestBaseObserver<UITextField> {
	override observe(observed: UITextField) {
		return super
			.observe(observed)
			.observePropertyAsync(
				"placeholder",
				"value",
				"disabled",
				"readOnly",
				"width",
				"style",
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
					this.scheduleUpdate(this.element);
					return;
				case "disabled":
				case "readOnly":
				case "width":
				case "style":
					this.scheduleUpdate(undefined, this.element);
					return;
			}
		}
		await super.handlePropertyChange(property, value, event);
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

	getOutput() {
		// NOTE: ignoring multiline flag here
		if (!this.observed) throw ReferenceError();
		let elt = new TestOutputElement("textfield");
		let output = new RenderContext.Output(this.observed, elt);
		elt.output = output;
		elt.focusable = true;
		return output;
	}

	override updateStyle(element: TestOutputElement) {
		let textField = this.observed;
		if (textField) {
			// set state
			element.disabled = textField.disabled;
			element.readOnly = textField.readOnly;

			// set styles
			element.styleClass =
				getBaseStyleClass(textField.style) || ui.style.TEXTFIELD;
			applyElementStyle(
				element,
				[
					textField.style,
					textField.width !== undefined
						? { width: textField.width, minWidth: 0 }
						: undefined,
				],
				textField.position,
			);
		}
	}

	updateContent(element: TestOutputElement) {
		if (!this.observed) return;
		element.text = String(this.observed.placeholder || "");

		let value = this.observed.value;
		value = value == null ? "" : String(value);
		element.value = value;
	}
}
