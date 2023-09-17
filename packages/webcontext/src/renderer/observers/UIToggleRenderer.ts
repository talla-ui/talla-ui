import {
	ManagedChangeEvent,
	RenderContext,
	UIToggle,
	UIToggleLabelStyle,
	UIToggleStyle,
} from "desk-frame";
import {
	applyElementClassName,
	applyElementStyle,
} from "../../style/DOMStyle.js";
import { CLASS_TOGGLE_WRAPPER } from "../../style/defaults/css.js";
import { BaseObserver, getBaseStyleClass } from "./BaseObserver.js";

let _nextId = 0;

/** @internal */
export class UIToggleRenderer extends BaseObserver<UIToggle> {
	override observe(observed: UIToggle) {
		return super
			.observe(observed)
			.observePropertyAsync(
				"label",
				"state",
				"disabled",
				"toggleStyle",
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
				case "label":
				case "state":
					this.scheduleUpdate(this.element);
					return;
				case "disabled":
				case "toggleStyle":
				case "labelStyle":
					this.scheduleUpdate(undefined, this.element);
					return;
			}
		}
		await super.handlePropertyChange(property, value, event);
	}

	override onDOMEvent() {
		let checkbox = this.element!.firstChild as HTMLInputElement;
		if (this.observed!.state !== checkbox.checked) {
			this.observed!.state = checkbox.checked;
		}
	}

	getOutput() {
		if (!this.observed) throw ReferenceError();
		let elt = document.createElement("span");
		let checkbox = document.createElement("input");
		checkbox.tabIndex = 0;
		checkbox.type = "checkbox";
		checkbox.checked = !!this.observed.state;
		checkbox.id = "UIToggle::" + _nextId;
		let label = document.createElement("label");
		label.htmlFor = "UIToggle::" + _nextId++;
		elt.appendChild(checkbox);
		elt.appendChild(label);
		let output = new RenderContext.Output(this.observed, elt);
		return output;
	}

	override updateStyle(element: HTMLElement) {
		let toggle = this.observed;
		if (toggle) {
			// set element (wrapper) style
			applyElementClassName(
				element,
				getBaseStyleClass(toggle.toggleStyle) || UIToggleStyle,
				CLASS_TOGGLE_WRAPPER,
			);
			applyElementStyle(element, [toggle.toggleStyle], toggle.position);

			// set label style
			let label = element.lastChild as HTMLLabelElement;
			applyElementClassName(
				element,
				getBaseStyleClass(toggle.labelStyle) || UIToggleLabelStyle,
				undefined,
				true,
			);
			applyElementStyle(label, [toggle.labelStyle], undefined, undefined, true);

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
	}

	updateContent(element: HTMLElement) {
		let toggle = this.observed;
		if (toggle) {
			// update checkbox state
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
			label.textContent = text == null ? "" : String(text);
		}
	}
}
