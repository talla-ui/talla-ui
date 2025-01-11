import { RenderContext, UITextField, ui } from "talla-ui";
import { applyStyles } from "../../style/DOMStyle.js";
import { BaseObserver } from "./BaseObserver.js";

/** @internal */
export class UITextFieldRenderer extends BaseObserver<UITextField> {
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

	override onDOMEvent(e: Event, data: any) {
		if (e.type === "focusin" && this.observed.selectOnFocus) {
			(this.element as HTMLInputElement).select();
		}
		if (e.type !== "input" && e.type !== "change") return;
		let value = (this.element as HTMLInputElement).value;
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
		let name = this.observed.name || this.observed.formField;
		if (name) elt.name = name;
		let output = new RenderContext.Output(this.observed, elt);
		return output;
	}

	override updateStyle(element: HTMLInputElement) {
		let textField = this.observed;
		// set state
		element.disabled = !!textField.disabled;
		element.readOnly = !!textField.readOnly;

		// apply other CSS styles
		applyStyles(
			element,
			[
				ui.style.TEXTFIELD,
				textField.style,
				textField.width !== undefined
					? { width: textField.width, minWidth: 0 }
					: undefined,
			],
			undefined,
			true,
			false,
			textField.position,
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
		if (this.observed.formField) element.name = this.observed.formField;
		if (this.observed.enterKeyHint || element.hasAttribute("enterkeyhint")) {
			element.enterKeyHint = this.observed.enterKeyHint || "";
		}
		if (this.observed.disableSpellCheck || element.hasAttribute("spellcheck")) {
			element.spellcheck = !this.observed.disableSpellCheck;
		}

		let value = this.observed.value;
		value = value == null ? "" : String(value);
		if (element.value != value) element!.value = value;
	}
}
