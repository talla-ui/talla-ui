import { RenderContext, UIButton, ui } from "@talla-ui/core";
import { TestOutputElement } from "../app/TestOutputElement.js";
import { TestBaseObserver, applyElementStyle } from "./TestBaseObserver.js";

/** @internal */
export class UIButtonRenderer extends TestBaseObserver<UIButton> {
	constructor(observed: UIButton) {
		super(observed);
		this.observeProperties(
			"label",
			"icon",
			"chevron",
			"disabled",
			"width",
			"pressed",
			"style",
		);
	}

	protected override propertyChange(property: string, value: any) {
		if (!this.element) return;
		switch (property) {
			case "label":
			case "icon":
			case "chevron":
				this.scheduleUpdate(this.element);
				return;
			case "disabled":
			case "pressed":
			case "width":
			case "style":
				this.scheduleUpdate(undefined, this.element);
				return;
		}
		super.propertyChange(property, value);
	}

	override handlePlatformEvent(
		name: TestOutputElement.PlatformEvent,
		data?: any,
	) {
		data.value = this.observed?.value;
		super.handlePlatformEvent(name, data);
		let button = this.observed;
		if (
			name === "click" &&
			button &&
			!button.isUnlinked() &&
			button.navigateTo !== undefined
		) {
			button.emit("Navigate");
		}
	}

	getOutput() {
		let elt = new TestOutputElement("button");
		let output = new RenderContext.Output(this.observed, elt);
		elt.output = output;
		elt.focusable = true;
		return output;
	}

	override updateStyle(element: TestOutputElement) {
		// set state
		let button = this.observed;
		element.disabled = !!button.disabled;
		element.pressed = !!button.pressed;

		// set styles
		applyElementStyle(element, [
			button.primary ? ui.style.BUTTON_PRIMARY : ui.style.BUTTON,
			button.style,
			button.position,
			button.width !== undefined
				? { width: button.width, minWidth: 0 }
				: undefined,
		]);
	}

	updateContent(element: TestOutputElement) {
		let button = this.observed;
		element.text = String(button.label || "");
		element.icon = String(button.icon || "");
		element.chevron = String(button.chevron || "");
		element.focusable = true;
	}
}
