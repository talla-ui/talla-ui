import { ManagedChangeEvent, RenderContext, UISeparator } from "desk-frame";
import { TestOutputElement } from "../app/TestOutputElement.js";
import { TestRenderObserver } from "./TestRenderObserver.js";

/** @internal */
export class UISeparatorRenderer extends TestRenderObserver<UISeparator> {
	override observe(observed: UISeparator) {
		return super
			.observe(observed)
			.observePropertyAsync("color", "margin", "thickness");
	}

	protected override async handlePropertyChange(
		property: string,
		value: any,
		event?: ManagedChangeEvent
	) {
		if (this.observed && this.element) {
			switch (property) {
				case "color":
				case "margin":
				case "thickness":
					// NOTE: this doesn't actually do much at all in the test renderer
					this.scheduleUpdate(undefined, this.element);
					return;
			}
		}
		await super.handlePropertyChange(property, value, event);
	}

	getOutput() {
		if (!this.observed) throw ReferenceError();
		let elt = new TestOutputElement("separator");
		let output = new RenderContext.Output(this.observed, elt);
		elt.output = output;
		return output;
	}

	updateContent(element: TestOutputElement) {
		// do nothing
	}
}
