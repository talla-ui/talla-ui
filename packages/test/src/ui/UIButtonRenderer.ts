import {
	ManagedChangeEvent,
	RenderContext,
	UIButton,
	UIComponentEvent,
} from "desk-frame";
import { TestOutputElement } from "../app/TestOutputElement.js";
import { TestRenderObserver } from "./TestRenderObserver.js";

/** @internal */
export class UIButtonRenderer extends TestRenderObserver<UIButton> {
	override observe(observed: UIButton) {
		return super
			.observe(observed)
			.observePropertyAsync(
				"label",
				"icon",
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
				case "icon":
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

	onSelect(e: UIComponentEvent) {
		if (e.source === this.observed && this.element) {
			this.element.selected = true;
		}
	}

	onDeselect(e: UIComponentEvent) {
		if (e.source === this.observed && this.element) {
			this.element.selected = false;
		}
	}

	override handlePlatformEvent(
		name: TestOutputElement.PlatformEvent,
		data?: any
	) {
		super.handlePlatformEvent(name, data);
		let button = this.observed;
		if (
			name === "click" &&
			button &&
			!button.isUnlinked() &&
			button.navigateTo
		) {
			button.emit("Navigate");
		}
	}

	getOutput() {
		if (!this.observed) throw ReferenceError();
		let elt = new TestOutputElement("button");
		let output = new RenderContext.Output(this.observed, elt);
		elt.output = output;
		return output;
	}

	override updateStyle(element: TestOutputElement) {
		let button = this.observed;
		if (!button) return;

		// set disabled state
		element.disabled = button.disabled;

		// set style objects
		super.updateStyle(
			element,
			{
				textStyle: button.textStyle,
				decoration: button.decoration,
			},
			button.shrinkwrap
		);
	}

	updateContent(element: TestOutputElement) {
		if (!this.observed) return;
		element.text = String(this.observed.label || "");
		element.icon = String(this.observed.icon || "");
		element.focusable = true;
	}
}
