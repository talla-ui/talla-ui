import { ManagedChangeEvent, RenderContext, UIToggle } from "desk-frame";
import { CLASS_TOGGLE } from "../../style/defaults/css.js";
import { BaseObserver } from "./BaseObserver.js";
import { applyDecorationCSS } from "../../style/DOMStyle.js";

let _nextId = 0;

/** @internal */
export class UIToggleRenderer extends BaseObserver<UIToggle> {
	override observe(observed: UIToggle) {
		return super
			.observe(observed)
			.observePropertyAsync(
				"label",
				"state",
				"textStyle",
				"decoration",
				"disabled",
				"shrinkwrap"
			);
	}

	protected override async handlePropertyChange(
		property: string,
		value: any,
		event?: ManagedChangeEvent
	) {
		if (this.observed && this.element) {
			switch (property) {
				case "label":
				case "state":
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
		if (!toggle) return;

		// set disabled state
		let checkbox = element.firstChild as HTMLInputElement;
		checkbox.disabled = !!toggle.disabled;

		// set style objects
		applyDecorationCSS(checkbox, toggle.decoration);
		super.updateStyle(
			element,
			{
				textStyle: toggle.textStyle,
				decoration: { cssClassNames: [CLASS_TOGGLE] },
			},
			toggle.shrinkwrap
		);
	}

	updateContent(element: HTMLElement) {
		let toggle = this.observed;
		if (!toggle) return;

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
		text = text == null ? "" : String(text);
		label.textContent = text ? "  " + text : "";
	}
}
