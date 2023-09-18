import {
	ManagedChangeEvent,
	RenderContext,
	UISeparator,
} from "@desk-framework/frame-core";
import {
	applyElementClassName,
	applyElementStyle,
	getCSSLength,
} from "../../style/DOMStyle.js";
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
		event?: ManagedChangeEvent,
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
		if (sep) {
			let systemName = CLASS_SEPARATOR_LINE;
			if (sep.vertical) systemName += CLASS_SEPARATOR_LINE_VERT;
			applyElementClassName(element, undefined, systemName);
			applyElementStyle(
				element,
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
}
