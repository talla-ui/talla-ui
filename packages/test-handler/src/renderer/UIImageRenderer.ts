import { RenderContext, UIImage, ui } from "@talla-ui/core";
import { TestOutputElement } from "../app/TestOutputElement.js";
import { TestBaseObserver, applyElementStyle } from "./TestBaseObserver.js";

/** @internal */
export class UIImageRenderer extends TestBaseObserver<UIImage> {
	constructor(observed: UIImage) {
		super(observed);
		this.observeProperties("url", "style");
	}

	protected override propertyChange(property: string, value: any) {
		if (!this.element) return;
		switch (property) {
			case "url":
				this.scheduleUpdate(this.element);
				return;
			case "style":
				this.scheduleUpdate(undefined, this.element);
				return;
		}
		super.propertyChange(property, value);
	}

	getOutput() {
		let elt = new TestOutputElement("image");
		let output = new RenderContext.Output(this.observed, elt);
		elt.output = output;
		if (this.observed.allowFocus || this.observed.allowKeyboardFocus)
			elt.focusable = true;
		return output;
	}

	override updateStyle(element: TestOutputElement) {
		let image = this.observed;
		applyElementStyle(element, [
			ui.style.IMAGE,
			image.style,
			{ width: image.width, height: image.height },
			image.position,
		]);
	}

	updateContent(element: TestOutputElement) {
		element.imageUrl = String(this.observed.url || "");
	}
}
