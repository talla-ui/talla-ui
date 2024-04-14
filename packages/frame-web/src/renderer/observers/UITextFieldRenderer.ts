import {
	ManagedEvent,
	RenderContext,
	UITextField,
	ui,
} from "@desk-framework/frame-core";
import { BaseObserver, getBaseStyleClass } from "./BaseObserver.js";
import { applyStyles } from "../../style/DOMStyle.js";

/** @internal */
export class UITextFieldRenderer extends BaseObserver<UITextField> {
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
		event?: ManagedEvent,
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

	override onDOMEvent() {
		let value = (this.element as HTMLInputElement).value;
		if (this.observed!.value !== value) this.observed!.value = value;
	}

	getOutput() {
		if (!this.observed) throw ReferenceError();
		let elt = document.createElement(
			this.observed.multiline ? "textarea" : "input",
		);
		elt.tabIndex = 0;
		let output = new RenderContext.Output(this.observed, elt);
		return output;
	}

	override updateStyle(element: HTMLInputElement) {
		let textField = this.observed;
		if (textField) {
			// set state
			element.disabled = !!textField.disabled;
			element.readOnly = !!textField.readOnly;

			// apply other CSS styles
			applyStyles(
				textField,
				element,
				getBaseStyleClass(textField.style) || ui.style.TEXTFIELD,
				undefined,
				true,
				false,
				[
					textField.style,
					textField.width !== undefined
						? { width: textField.width, minWidth: 0 }
						: undefined,
				],
				textField.position,
				undefined,
			);
		}
	}

	updateContent(element: HTMLInputElement) {
		if (!this.observed) return;
		let placeholder = String(this.observed.placeholder || " "); // layout workaround
		if (element.placeholder !== placeholder) {
			element.placeholder = placeholder;
		}
		if (!this.observed.multiline && element.type !== this.observed.type) {
			element.type = this.observed.type;
		}
		if (this.observed.formField) element.name = this.observed.formField;
		if (this.observed.enterKeyHint)
			element.enterKeyHint = this.observed.enterKeyHint;
		element.spellcheck = !this.observed.disableSpellCheck;

		let value = this.observed.value;
		value = value == null ? "" : String(value);
		if (element.value != value) element!.value = value;
	}
}
