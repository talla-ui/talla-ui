import {
	ManagedEvent,
	RenderContext,
	UILabel,
	ui,
} from "@desk-framework/frame-core";
import { TestOutputElement } from "../app/TestOutputElement.js";
import {
	TestBaseObserver,
	applyElementStyle,
	getBaseStyleClass,
} from "./TestBaseObserver.js";

/** @internal */
export class UILabelRenderer extends TestBaseObserver<UILabel> {
	override observe(observed: UILabel) {
		return super
			.observe(observed)
			.observePropertyAsync(
				"text",
				"icon",
				"bold",
				"italic",
				"color",
				"width",
				"dim",
				"style",
			);
	}

	protected override async handlePropertyChange(
		property: string,
		value: any,
		event?: ManagedEvent,
	) {
		if (this.observed && this.element) {
			switch (property) {
				case "text":
				case "icon":
					this.scheduleUpdate(this.element);
					return;
				case "bold":
				case "italic":
				case "color":
				case "width":
				case "dim":
				case "style":
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
		if (this.observed.allowFocus || this.observed.allowKeyboardFocus)
			elt.focusable = true;
		return output;
	}

	override updateStyle(element: TestOutputElement) {
		let label = this.observed;
		if (label) {
			element.styleClass =
				getBaseStyleClass(label.style) ||
				(label.title
					? ui.style.LABEL_TITLE
					: label.small
					? ui.style.LABEL_SMALL
					: ui.style.LABEL);
			applyElementStyle(
				element,
				[
					label.style,
					{
						width: label.width,
						bold: label.bold,
						italic: label.italic,
						textColor: label.color,
						opacity:
							label.dim === true ? 0.5 : label.dim === false ? 1 : label.dim,
						lineBreakMode: label.wrap ? "pre-wrap" : undefined,
						userSelect: label.selectable || undefined,
					},
				],
				label.position,
			);
		}
	}

	updateContent(element: TestOutputElement) {
		if (!this.observed) return;
		element.text = String(this.observed.text);
		element.icon = String(this.observed.icon || "");
	}
}
