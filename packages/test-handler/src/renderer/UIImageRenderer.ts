import { RenderContext, UIImage, ui } from "@talla-ui/core";
import { TestOutputElement } from "../TestOutputElement.js";
import { TestBaseObserver, applyElementStyle } from "./TestBaseObserver.js";

/** @internal */
export class UIImageRenderer extends TestBaseObserver<UIImage> {
	constructor(observed: UIImage) {
		super(observed);
		this.observeProperties("url", "icon", "iconColor", "style");
	}

	protected override propertyChange(property: string, value: any) {
		if (!this.element) return;
		switch (property) {
			case "url":
			case "icon":
			case "iconColor":
				return this.scheduleUpdate(this.element);
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
			{
				width: image.width,
				height: image.height,
				grow: image.grow,
			},
			image.position,
		]);
	}

	updateContent(element: TestOutputElement) {
		element.imageUrl = String(this.observed.url || "");
		element.icon = String(this.observed.icon || "");

		// simulate load event
		if (this.observed.url) {
			setTimeout(() => {
				this.observed.emit("Load");
			}, 10);
		}
	}
}
