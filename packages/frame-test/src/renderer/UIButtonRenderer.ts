import {
	ManagedChangeEvent,
	RenderContext,
	UIButton,
	ui,
} from "@desk-framework/frame-core";
import { TestOutputElement } from "../app/TestOutputElement.js";
import {
	TestBaseObserver,
	applyElementStyle,
	getBaseStyleClass,
} from "./TestBaseObserver.js";

/** @internal */
export class UIButtonRenderer extends TestBaseObserver<UIButton> {
	override observe(observed: UIButton) {
		return super
			.observe(observed)
			.observePropertyAsync(
				"label",
				"icon",
				"chevron",
				"disabled",
				"width",
				"pressed",
				"style",
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
		}
		await super.handlePropertyChange(property, value, event);
	}

	override handlePlatformEvent(
		name: TestOutputElement.PlatformEvent,
		data?: any,
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
		elt.focusable = true;
		return output;
	}

	override updateStyle(element: TestOutputElement) {
		let button = this.observed;
		if (button) {
			// set state
			element.disabled = button.disabled;
			element.pressed = button.pressed;

			// set styles
			element.styleClass =
				getBaseStyleClass(button.style) ||
				(button.primary ? ui.style.BUTTON_PRIMARY : ui.style.BUTTON);
			applyElementStyle(
				element,
				[
					button.style,
					button.width !== undefined
						? { width: button.width, minWidth: 0 }
						: undefined,
				],
				button.position,
			);
		}
	}

	updateContent(element: TestOutputElement) {
		if (!this.observed) return;
		element.text = String(this.observed.label || "");
		element.icon = String(this.observed.icon || "");
		element.chevron = String(this.observed.chevron || "");
		element.focusable = true;
	}
}
