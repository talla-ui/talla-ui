import { RenderContext, UIToggle, ui } from "@desk-framework/frame-core";
import { TestOutputElement } from "../app/TestOutputElement.js";
import {
	TestBaseObserver,
	applyElementStyle,
	getBaseStyleClass,
} from "./TestBaseObserver.js";

/** @internal */
export class UIToggleRenderer extends TestBaseObserver<UIToggle> {
	constructor(observed: UIToggle) {
		super(observed);
		this.observeProperties("label", "state", "disabled", "style", "labelStyle");
	}

	protected override propertyChange(property: string, value: any) {
		if (!this.element) return;
		switch (property) {
			case "label":
			case "state":
				this.scheduleUpdate(this.element);
				return;
			case "disabled":
			case "style":
			case "labelStyle":
				this.scheduleUpdate(undefined, this.element);
				return;
		}
		super.propertyChange(property, value);
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

		data.state = this.observed?.state;
		super.handlePlatformEvent(name, data);
	}

	getOutput() {
		let elt = new TestOutputElement("toggle");
		let output = new RenderContext.Output(this.observed, elt);
		elt.output = output;
		elt.focusable = true;
		return output;
	}

	override updateStyle(element: TestOutputElement) {
		let toggle = this.observed;

		// set disabled state
		element.disabled = toggle.disabled;

		// set styles
		element.styleClass = getBaseStyleClass(toggle.style) || ui.style.TOGGLE;
		applyElementStyle(
			element,
			[
				toggle.style,
				toggle.width !== undefined ? { width: toggle.width } : undefined,
			],
			toggle.position,
		);
	}

	updateContent(element: TestOutputElement) {
		element.text = String(this.observed.label || "");
		element.checked = !!this.observed.state;
	}
}
