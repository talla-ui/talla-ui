import {
	ManagedChangeEvent,
	RenderContext,
	UIButton,
	UIButtonStyle,
	UIComponentEvent,
} from "desk-frame";
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
				"buttonStyle",
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
				case "width":
				case "buttonStyle":
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
			// set disabled state
			element.disabled = button.disabled;

			// set styles
			element.styleClass =
				getBaseStyleClass(button.buttonStyle) || UIButtonStyle;
			applyElementStyle(
				element,
				[
					button.buttonStyle,
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
