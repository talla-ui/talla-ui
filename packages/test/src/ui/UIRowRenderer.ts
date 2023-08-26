import { ManagedChangeEvent, RenderContext, UIRow } from "desk-frame";
import { TestOutputElement } from "../app/TestOutputElement.js";
import { UIContainerRenderer } from "./UIContainerRenderer.js";

/** @internal */
export class UIRowRenderer extends UIContainerRenderer<UIRow> {
	override observe(observed: UIRow) {
		return super.observe(observed), this.observePropertyAsync("height");
	}

	protected override async handlePropertyChange(
		property: string,
		value: any,
		event?: ManagedChangeEvent
	) {
		if (this.observed && this.element) {
			if (property === "height") {
				this.scheduleUpdate(undefined, this.element);
				return;
			}
		}
		await super.handlePropertyChange(property, value, event);
	}

	override getOutput() {
		if (!this.observed) throw ReferenceError();
		let elt = new TestOutputElement("row");
		let output = new RenderContext.Output(this.observed, elt);
		elt.output = output;
		return output;
	}

	override updateStyle(element: TestOutputElement) {
		let row = this.observed;
		if (!row) return;
		let dimensions = row.dimensions;
		if (row.height) dimensions = { ...dimensions, height: row.height };
		super.updateStyle(element, { dimensions });
	}
}
