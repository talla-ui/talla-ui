import { ManagedChangeEvent, RenderContext, UISeparator } from "desk-frame";
import { getCSSLength } from "../../style/DOMStyle.js";
import {
	CLASS_SEPARATOR_LINE,
	CLASS_SEPARATOR_LINE_VERT,
} from "../../style/defaults/css.js";
import { BaseObserver } from "./BaseObserver.js";

/** @internal */
export class UISeparatorRenderer extends BaseObserver<UISeparator> {
	override observe(observed: UISeparator) {
		return super
			.observe(observed)
			.observePropertyAsync("color", "margin", "thickness");
	}

	protected override async handlePropertyChange(
		property: string,
		value: any,
		event?: ManagedChangeEvent
	) {
		if (this.observed && this.element) {
			switch (property) {
				case "color":
				case "margin":
				case "thickness":
					this.scheduleUpdate(undefined, this.element);
					return;
			}
		}
		await super.handlePropertyChange(property, value, event);
	}

	getOutput() {
		if (!this.observed) throw ReferenceError();
		let elt = document.createElement("hr");
		let output = new RenderContext.Output(this.observed, elt);
		return output;
	}

	updateContent() {}

	override updateStyle(element: HTMLElement) {
		let sep = this.observed;
		if (!sep) return;
		let addClass =
			CLASS_SEPARATOR_LINE +
			(sep.vertical ? " " + CLASS_SEPARATOR_LINE_VERT : "");

		let decoration = { ...sep.decoration };
		decoration.cssClassNames = decoration.cssClassNames
			? [...decoration.cssClassNames, addClass]
			: [addClass];
		if (sep.color) decoration.borderColor = sep.color;
		if (sep.thickness) decoration.borderThickness = sep.thickness;
		super.updateStyle(element, { decoration });
		if (sep.margin) {
			let margin = getCSSLength(sep.margin);
			element.style.margin = sep.vertical ? "0 " + margin : margin + " 0";
		}
	}
}
