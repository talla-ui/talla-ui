import { RenderContext, UISpacer } from "@talla-ui/core";
import { applyStyles } from "../../style/DOMStyle.js";
import { BaseObserver } from "./BaseObserver.js";

/** @internal */
export class UISpacerRenderer extends BaseObserver<UISpacer> {
	constructor(observed: UISpacer) {
		super(observed);
		this.observeProperties("width", "height", "minWidth", "minHeight");
	}

	getOutput() {
		let elt = document.createElement("spacer" as string);
		let output = new RenderContext.Output(this.observed, elt);
		return output;
	}

	updateContent() {}

	override updateStyle(element: HTMLElement) {
		let spacer = this.observed;
		// set CSS styles
		let { width, height, minWidth, minHeight } = spacer;
		let hasFixed = width !== undefined || height !== undefined;
		applyStyles(
			element,
			[
				{
					width,
					height,
					minWidth,
					minHeight,
					grow: spacer.grow ?? (hasFixed ? 0 : 1),
				},
			],
			undefined,
			false,
			false,
			spacer.position,
		);
	}
}
