import { RenderContext, UIToggle, ui } from "@talla-ui/core";
import { applyStyles } from "../../style/DOMStyle.js";
import { CLASS_TOGGLE, CLASS_TOGGLE_TYPE } from "../../style/defaults/css.js";
import { BaseObserver } from "./BaseObserver.js";

let _nextId = 0;

/** @internal */
export class UIToggleRenderer extends BaseObserver<UIToggle> {
	constructor(observed: UIToggle) {
		super(observed);
		this.observeProperties("label", "state", "disabled", "style", "labelStyle");
	}

	protected override propertyChange(property: string, value: any) {
		if (!this.element) return;
		switch (property) {
			case "label":
			case "state":
				return this.scheduleUpdate(this.element);
		}
		super.propertyChange(property, value);
	}

	override onDOMEvent(e: Event, data: any) {
		if (e.type !== "input" && e.type !== "change") return;
		let checkbox = this.element!.firstChild as HTMLInputElement;
		if (this.observed!.state !== checkbox.checked) {
			this.observed!.state = checkbox.checked;
		}
		data.state = checkbox.checked;
	}

	getOutput() {
		let elt = document.createElement("span");
		let checkbox = document.createElement("input");
		checkbox.tabIndex = 0;
		checkbox.type = "checkbox";
		checkbox.checked = !!this.observed.state;
		checkbox.id = "UIToggle::" + _nextId;
		let name = this.observed.name || this.observed.formField;
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
			[
				ui.style.TOGGLE,
				toggle.style,
				toggle.width !== undefined
					? { width: toggle.width, minWidth: toggle.width }
					: undefined,
				toggle.grow !== undefined ? { grow: toggle.grow ? 1 : 0 } : undefined,
			],
			CLASS_TOGGLE + " " + CLASS_TOGGLE_TYPE[toggle.type],
			false,
			false,
			toggle.position,
		);

		// set label style
		let label = element.lastChild as HTMLLabelElement;
		applyStyles(
			label,
			[ui.style.TOGGLE_LABEL, toggle.labelStyle],
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
		if (toggle.formField) checkbox.name = toggle.formField;
		if (checkbox.checked && !toggle.state) {
			checkbox.checked = false;
		} else if (!checkbox.checked && toggle.state) {
			checkbox.checked = true;
		}

		// update label
		let label = element.lastChild as HTMLLabelElement;
		let text = toggle.label;
		label.style.display = text ? "" : "none";
		label.textContent = text == null ? "" : String(text);
	}
}
