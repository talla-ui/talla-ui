import { RenderContext, UI, UIIconResource, UIImage } from "@talla-ui/core";
import { TestOutputElement } from "../TestOutputElement.js";
import { TestBaseObserver, applyElementStyle } from "./TestBaseObserver.js";

const IMAGE_STYLE = UI.styles.image.default;

/** @internal */
export class UIImageRenderer extends TestBaseObserver<UIImage> {
	constructor(observed: UIImage) {
		super(observed);
		this.observeProperties("source");
	}

	protected override propertyChange(property: string, value: any) {
		if (!this.element) return;
		switch (property) {
			case "source":
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
		applyElementStyle(element, [IMAGE_STYLE, image.style, image.position]);
	}

	updateContent(element: TestOutputElement) {
		if (this.observed.source instanceof UIIconResource) {
			element.icon = String(this.observed.source);
			element.imageUrl = undefined;
		} else {
			element.imageUrl = String(this.observed.source || "");
			element.icon = undefined;
		}

		// simulate load event
		if (this.observed.source) {
			setTimeout(() => {
				this.observed.emit("Load");
			}, 10);
		}
	}
}
