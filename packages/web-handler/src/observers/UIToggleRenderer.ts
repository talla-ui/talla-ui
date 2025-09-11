import { RenderContext, UI, UIToggle } from "@talla-ui/core";
import { applyStyles } from "../DOMStyle.js";
import { CLASS_TOGGLE, CLASS_TOGGLE_TYPE } from "../defaults/css.js";
import { BaseObserver } from "./BaseObserver.js";

let _nextId = 0;

const TOGGLE_STYLE = UI.styles.toggle.default;
const TOGGLE_LABEL_STYLE = UI.styles.label.toggleLabel;

/** @internal */
export class UIToggleRenderer extends BaseObserver<UIToggle> {
	constructor(observed: UIToggle) {
		super(observed);
		this.observeProperties("label", "value", "disabled", "labelStyle");
	}

	protected override propertyChange(property: string, value: any) {
		if (!this.element) return;
		switch (property) {
			case "label":
			case "value":
				return this.scheduleUpdate(this.element);
		}
		super.propertyChange(property, value);
	}

	override onDOMEvent(e: Event, data: any) {
		if (this.observed?.disabled) return false;
		if (e.type !== "input" && e.type !== "change") return;
		let checkbox = this.element!.firstChild as HTMLInputElement;
		if (this.observed!.value !== checkbox.checked) {
			this.observed!.value = checkbox.checked;
		}
		data.value = checkbox.checked;
	}

	getOutput() {
		let elt = document.createElement("span");
		let checkbox = document.createElement("input");
		checkbox.tabIndex = 0;
		checkbox.type = "checkbox";
		checkbox.checked = !!this.observed.value;
		checkbox.id = "UIToggle::" + _nextId;
		let name = this.observed.name;
		if (name) checkbox.name = name;
		let label = document.createElement("label");
		label.htmlFor = "UIToggle::" + _nextId++;
		elt.appendChild(checkbox);
		elt.appendChild(label);
		let output = new RenderContext.Output(this.observed, elt);
		return output;
	}

	override updateStyle(element: HTMLElement) {
		let toggle = this.observed;

		// set element (wrapper) style
		applyStyles(
			element,
			[TOGGLE_STYLE, toggle.style],
			CLASS_TOGGLE + " " + CLASS_TOGGLE_TYPE[toggle.type],
			false,
			false,
			toggle.position,
		);

		// set label style
		let label = element.lastChild as HTMLLabelElement;
		applyStyles(
			label,
			[TOGGLE_LABEL_STYLE, toggle.labelStyle],
			undefined,
			true,
			false,
		);

		// set disabled state
		let checkbox = element.firstChild as HTMLInputElement;
		checkbox.disabled = !!toggle.disabled;
		if (toggle.disabled) {
			element.setAttribute("disabled", "disabled");
			label.setAttribute("disabled", "disabled");
		} else {
			element.removeAttribute("disabled");
			label.removeAttribute("disabled");
		}
	}

	updateContent(element: HTMLElement) {
		// update checkbox state
		let toggle = this.observed;
		let checkbox = element.firstChild as HTMLInputElement;
		if (toggle.name) checkbox.name = toggle.name;
		if (checkbox.checked && !toggle.value) {
			checkbox.checked = false;
		} else if (!checkbox.checked && toggle.value) {
			checkbox.checked = true;
		}

		// update label
		let label = element.lastChild as HTMLLabelElement;
		let text = toggle.label;
		label.style.display = text ? "" : "none";
		label.textContent = text == null ? "" : String(text);
	}
}
