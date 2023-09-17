import {
	ManagedChangeEvent,
	RenderContext,
	UIToggle,
	UIToggleStyle,
} from "desk-frame";
import { TestOutputElement } from "../app/TestOutputElement.js";
import {
	TestBaseObserver,
	applyElementStyle,
	getBaseStyleClass,
} from "./TestBaseObserver.js";

/** @internal */
export class UIToggleRenderer extends TestBaseObserver<UIToggle> {
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

	override handlePlatformEvent(
		name: TestOutputElement.PlatformEvent,
		data?: any,
	) {
		// update 'state' first, reflecting element checked state
		let checkbox = this.element!;
		if (this.observed!.state !== checkbox.checked) {
			this.observed!.state = !!checkbox.checked;
		}

		super.handlePlatformEvent(name, data);
	}

	getOutput() {
		if (!this.observed) throw ReferenceError();
		let elt = new TestOutputElement("toggle");
		let output = new RenderContext.Output(this.observed, elt);
		elt.output = output;
		elt.focusable = true;
		return output;
	}

	override updateStyle(element: TestOutputElement) {
		let toggle = this.observed;
		if (toggle) {
			// set disabled state
			element.disabled = toggle.disabled;

			// set styles
			element.styleClass =
				getBaseStyleClass(toggle.toggleStyle) || UIToggleStyle;
			applyElementStyle(element, [toggle.toggleStyle], toggle.position);
		}
	}

	updateContent(element: TestOutputElement) {
		if (!this.observed) return;
		element.text = String(this.observed.label || "");
		element.checked = !!this.observed.state;
	}
}
