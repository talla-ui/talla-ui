import { ManagedChangeEvent, RenderContext, UIColumn } from "desk-frame";
import { TestOutputElement } from "../app/TestOutputElement.js";
import { UIContainerRenderer } from "./UIContainerRenderer.js";

/** @internal */
export class UIColumnRenderer extends UIContainerRenderer<UIColumn> {
	override observe(observed: UIColumn) {
		return super.observe(observed), this.observePropertyAsync("width");
	}

	protected override async handlePropertyChange(
		property: string,
		value: any,
		event?: ManagedChangeEvent
	) {
		if (this.observed && this.element) {
			if (property === "width") {
				this.scheduleUpdate(undefined, this.element);
				return;
			}
		}
		await super.handlePropertyChange(property, value, event);
	}

	override getOutput() {
		if (!this.observed) throw ReferenceError();
		let elt = new TestOutputElement("column");
		let output = new RenderContext.Output(this.observed, elt);
		elt.output = output;
		return output;
	}

	override updateStyle(element: TestOutputElement) {
		let row = this.observed;
		if (!row) return;
		let dimensions = row.dimensions;
		if (row.width) dimensions = { ...dimensions, width: row.width };
		super.updateStyle(element, { dimensions });
	}
}
