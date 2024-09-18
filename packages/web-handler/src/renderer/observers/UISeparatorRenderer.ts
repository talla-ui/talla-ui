import { RenderContext, UISeparator } from "talla-ui";
import { applyStyles, getCSSLength } from "../../style/DOMStyle.js";
import {
	CLASS_SEPARATOR_LINE,
	CLASS_SEPARATOR_LINE_VERT,
} from "../../style/defaults/css.js";
import { BaseObserver } from "./BaseObserver.js";

/** @internal */
export class UISeparatorRenderer extends BaseObserver<UISeparator> {
	constructor(observed: UISeparator) {
		super(observed);
		this.observeProperties("color", "margin", "thickness");
	}

	protected override propertyChange(property: string, value: any) {
		if (!this.element) return;
		switch (property) {
			case "color":
			case "margin":
			case "thickness":
				this.scheduleUpdate(undefined, this.element);
				return;
		}
		super.propertyChange(property, value);
	}

	getOutput() {
		let elt = document.createElement("hr");
		let output = new RenderContext.Output(this.observed, elt);
		return output;
	}

	updateContent() {}

	override updateStyle(element: HTMLElement) {
		let sep = this.observed;
		let systemName = CLASS_SEPARATOR_LINE;
		if (sep.vertical) systemName += " " + CLASS_SEPARATOR_LINE_VERT;
		applyStyles(
			sep,
			element,
			undefined,
			systemName,
			false,
			false,
			[
				{
					borderColor: sep.color,
					borderThickness: sep.thickness,
				},
			],
			sep.position,
		);

		// set margin separately
		let margin = sep.margin ? getCSSLength(sep.margin) : undefined;
		let cssMargin = margin
			? sep.vertical
				? "0 " + margin
				: margin + " 0"
			: "";
		element.style.margin = cssMargin;
	}
}
