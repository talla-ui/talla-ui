import { ManagedChangeEvent, RenderContext, UIToggle } from "desk-frame";
import { TestOutputElement } from "../app/TestOutputElement.js";
import { TestRenderObserver } from "./TestRenderObserver.js";

/** @internal */
export class UIToggleRenderer extends TestRenderObserver<UIToggle> {
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

	getOutput() {
		if (!this.observed) throw ReferenceError();
		let elt = new TestOutputElement("toggle");
		let output = new RenderContext.Output(this.observed, elt);
		elt.output = output;
		return output;
	}

	override handlePlatformEvent(
		name: TestOutputElement.PlatformEvent,
		data?: any
	) {
		// update 'state' first, reflecting element checked state
		if (this.element && this.observed) {
			this.observed.state = !!this.element.checked;
		}

		super.handlePlatformEvent(name, data);
	}

	override updateStyle(element: TestOutputElement) {
		let toggle = this.observed;
		if (!toggle) return;

		// set disabled state
		element.disabled = toggle.disabled;

		// set style objects
		super.updateStyle(
			element,
			{
				textStyle: toggle.textStyle,
				decoration: toggle.decoration,
			},
			toggle.shrinkwrap
		);
	}

	updateContent(element: TestOutputElement) {
		if (!this.observed) return;
		element.text = String(this.observed.label || "");
		element.checked = !!this.observed.state;
		element.focusable = true;
	}
}
