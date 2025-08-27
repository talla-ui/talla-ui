import { RenderContext, UI, UIDivider, UIStyle } from "@talla-ui/core";
import { applyStyles, getCSSLength } from "../DOMStyle.js";
import {
	CLASS_SEPARATOR_LINE,
	CLASS_SEPARATOR_LINE_VERT,
} from "../defaults/css.js";
import { BaseObserver } from "./BaseObserver.js";

/** @internal */
export class UIDividerRenderer extends BaseObserver<UIDivider> {
	constructor(observed: UIDivider) {
		super(observed);
		this.observeProperties("lineColor", "lineMargin", "lineWidth", "vertical");
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
				sep.style,
				{
					borderColor: sep.lineColor || UI.colors.divider,
					borderWidth: sep.lineWidth,
				},
			],
			systemName,
			false,
			false,
			sep.position,
		);

		// set margin separately (to distinguish vertical from horizontal)
		let margin = getCSSLength(
			sep.lineMargin != null ? sep.lineMargin : UIStyle.defaultOptions.gap,
		);
		let cssMargin =
			margin.indexOf(" ") < 0
				? sep.vertical
					? "0 " + margin
					: margin + " 0"
				: margin;
		element.style.margin = cssMargin;
	}
}
