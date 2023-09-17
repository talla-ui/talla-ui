import {
	ManagedChangeEvent,
	RenderContext,
	UIImage,
	UIImageStyle,
} from "desk-frame";
import { TestOutputElement } from "../app/TestOutputElement.js";
import {
	TestBaseObserver,
	applyElementStyle,
	getBaseStyleClass,
} from "./TestBaseObserver.js";

/** @internal */
export class UIImageRenderer extends TestBaseObserver<UIImage> {
	override observe(observed: UIImage) {
		return super.observe(observed).observePropertyAsync("url", "imageStyle");
	}

	protected override async handlePropertyChange(
		property: string,
		value: any,
		event?: ManagedChangeEvent,
	) {
		if (this.observed && this.element) {
			switch (property) {
				case "url":
					this.scheduleUpdate(this.element);
					return;
				case "imageStyle":
					this.scheduleUpdate(undefined, this.element);
					return;
			}
		}
		await super.handlePropertyChange(property, value, event);
	}

	getOutput() {
		if (!this.observed) throw ReferenceError();
		let elt = new TestOutputElement("image");
		let output = new RenderContext.Output(this.observed, elt);
		elt.output = output;
		if (this.observed.allowFocus || this.observed.allowKeyboardFocus)
			elt.focusable = true;
		return output;
	}

	override updateStyle(element: TestOutputElement) {
		let image = this.observed;
		if (image) {
			element.styleClass = getBaseStyleClass(image.imageStyle) || UIImageStyle;
			applyElementStyle(
				element,
				[image.imageStyle, { width: image.width, height: image.height }],
				image.position,
			);
		}
	}

	updateContent(element: TestOutputElement) {
		if (!this.observed) return;
		element.imageUrl = String(this.observed.url || "");
	}
}
