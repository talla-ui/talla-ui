import { RenderContext, UISeparator } from "@talla-ui/core";
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
			element,
			[
				{
					borderColor: sep.color,
					borderThickness: sep.thickness,
					grow: sep.grow,
				},
			],
			systemName,
			false,
			false,
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
