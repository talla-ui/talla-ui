import { ManagedChangeEvent, RenderContext, UILabel } from "desk-frame";
import { TestOutputElement } from "../app/TestOutputElement.js";
import { TestRenderObserver } from "./TestRenderObserver.js";

/** @internal */
export class UILabelRenderer extends TestRenderObserver<UILabel> {
	override observe(observed: UILabel) {
		return super
			.observe(observed)
			.observePropertyAsync(
				"text",
				"icon",
				"textStyle",
				"decoration",
				"disabled",
				"shrinkwrap",
			);
	}

	protected override async handlePropertyChange(
		property: string,
		value: any,
		event?: ManagedChangeEvent,
	) {
		if (this.observed && this.element) {
			switch (property) {
				case "text":
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

	getOutput() {
		if (!this.observed) throw ReferenceError();
		let elt = new TestOutputElement("label");
		let output = new RenderContext.Output(this.observed, elt);
		elt.output = output;
		return output;
	}

	override updateStyle(element: TestOutputElement) {
		let label = this.observed;
		if (!label) return;

		// set disabled state
		element.disabled = label.disabled;

		// set style objects
		super.updateStyle(
			element,
			{
				textStyle: label.textStyle,
				decoration: label.decoration,
			},
			label.shrinkwrap,
		);
	}

	updateContent(element: TestOutputElement) {
		if (!this.observed) return;
		element.text = String(this.observed.text);
		element.icon = String(this.observed.icon);
		element.focusable =
			this.observed.allowFocus || this.observed.allowKeyboardFocus;
	}
}
