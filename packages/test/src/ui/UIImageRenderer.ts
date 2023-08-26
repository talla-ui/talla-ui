import { ManagedChangeEvent, RenderContext, UIImage } from "desk-frame";
import { TestOutputElement } from "../app/TestOutputElement.js";
import { TestRenderObserver } from "./TestRenderObserver.js";

/** @internal */
export class UIImageRenderer extends TestRenderObserver<UIImage> {
	override observe(observed: UIImage) {
		return super
			.observe(observed)
			.observePropertyAsync("url", "decoration", "shrinkwrap");
	}

	protected override async handlePropertyChange(
		property: string,
		value: any,
		event?: ManagedChangeEvent
	) {
		if (this.observed && this.element) {
			switch (property) {
				case "url":
					this.scheduleUpdate(this.element);
					return;
				case "decoration":
				case "shrinkwrap":
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
		return output;
	}

	override updateStyle(element: TestOutputElement) {
		let image = this.observed;
		if (!image) return;

		// set style objects
		super.updateStyle(
			element,
			{ decoration: image.decoration },
			image.shrinkwrap
		);
	}

	updateContent(element: TestOutputElement) {
		if (!this.observed) return;
		element.imageUrl = String(this.observed.url || "");
		element.focusable =
			this.observed.allowFocus || this.observed.allowKeyboardFocus;
	}
}
