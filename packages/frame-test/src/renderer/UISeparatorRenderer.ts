import {
	ManagedChangeEvent,
	RenderContext,
	UISeparator,
} from "@desk-framework/frame-core";
import { TestOutputElement } from "../app/TestOutputElement.js";
import { TestBaseObserver, applyElementStyle } from "./TestBaseObserver.js";

/** @internal */
export class UISeparatorRenderer extends TestBaseObserver<UISeparator> {
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
		let elt = new TestOutputElement("separator");
		let output = new RenderContext.Output(this.observed, elt);
		elt.output = output;
		return output;
	}

	updateContent() {}

	updateStyle(element: TestOutputElement) {
		let sep = this.observed;
		if (sep) {
			// NOTE: margin is ignored in test renderer
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
		}
	}
}
