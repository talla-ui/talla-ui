import { RenderContext, UI, UITextField } from "@talla-ui/core";
import { applyStyles } from "../DOMStyle.js";
import { BaseObserver } from "./BaseObserver.js";

const TEXTFIELD_STYLE = UI.styles.textfield.default;

/** @internal */
export class UITextFieldRenderer extends BaseObserver<UITextField> {
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

	override onDOMEvent(e: Event, data: any) {
		if (this.observed?.disabled) return false;
		let elt = this.element as HTMLInputElement;
		if (e.type === "focusin" && this.observed.selectOnFocus) {
			elt.select();
		}
		if (e.type === "focusout" && this.observed.trim) {
			elt.value = elt.value.trim();
		}
		if (e.type !== "input" && e.type !== "change") return;
		let value = elt.value;
		if (this.observed.trim) value = value.trim();
		if (this.observed!.value !== value) {
			this.observed!.value = value;
		}
		data.value = value;
	}

	getOutput() {
		let elt = document.createElement(
			this.observed.multiline ? "textarea" : "input",
		);
		elt.tabIndex = 0;
		let name = this.observed.name;
		if (name) elt.name = name;
		let output = new RenderContext.Output(this.observed, elt);
		return output;
	}

	override updateStyle(element: HTMLInputElement) {
		let textfield = this.observed;

		// set state
		element.disabled = !!textfield.disabled;
		element.readOnly = !!textfield.readOnly;

		// apply other CSS styles
		applyStyles(
			element,
			[TEXTFIELD_STYLE, textfield.style],
			undefined,
			true,
			false,
			textfield.position,
		);
	}

	updateContent(element: HTMLInputElement) {
		let placeholder = String(this.observed.placeholder || " "); // layout workaround
		if (element.placeholder !== placeholder) {
			element.placeholder = placeholder;
		}
		if (!this.observed.multiline) {
			if (
				this.observed.type === "numeric" ||
				this.observed.type === "decimal"
			) {
				element.inputMode = this.observed.type;
				element.type = "text";
			} else {
				element.type = this.observed.type;
				element.inputMode = "text";
			}
		}
		if (this.observed.name) element.name = this.observed.name;
		if (this.observed.enterKeyHint || element.hasAttribute("enterkeyhint")) {
			element.enterKeyHint = this.observed.enterKeyHint || "";
		}
		if (this.observed.disableSpellCheck || element.hasAttribute("spellcheck")) {
			element.spellcheck = !this.observed.disableSpellCheck;
		}

		let value = this.observed.value;
		value = value == null ? "" : String(value);
		let elementValue = element.value;
		if (this.observed.trim) elementValue = elementValue.trim();
		if (elementValue != value) element!.value = value;
	}
}
