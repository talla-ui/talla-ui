import { RenderContext, StyleOverrides, UI, UIDivider } from "@talla-ui/core";
import { applyStyles } from "../DOMStyle.js";
import {
	CLASS_SEPARATOR_LINE,
	CLASS_SEPARATOR_LINE_VERT,
} from "../defaults/css.js";
import { BaseObserver } from "./BaseObserver.js";

/** @internal */
export class UIDividerRenderer extends BaseObserver<UIDivider> {
	constructor(observed: UIDivider) {
		super(observed);
		this.observeProperties("lineColor", "lineWidth", "lineStyle", "vertical");
	}

	getOutput() {
		let elt = document.createElement("hr");
		let output = new RenderContext.Output(this.observed, elt);
		return output;
	}

	updateContent() {}

	override updateStyle(element: HTMLElement) {
		let sep = this.observed;
		let systemClass = CLASS_SEPARATOR_LINE;
		if (sep.vertical) systemClass += " " + CLASS_SEPARATOR_LINE_VERT;
		let style: StyleOverrides = {
			...sep.style,
			borderColor: sep.lineColor || UI.colors.divider,
			borderWidth: sep.lineWidth,
			borderStyle: sep.lineStyle,
		};
		applyStyles(
			element,
			undefined,
			style,
			systemClass,
			false,
			false,
			sep.position,
		);
	}
}
