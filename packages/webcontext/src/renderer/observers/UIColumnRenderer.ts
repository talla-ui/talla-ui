import { ManagedChangeEvent, UIColumn } from "desk-frame";
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

	override updateStyle(element: HTMLElement) {
		let row = this.observed;
		if (!row) return;
		let dimensions = row.dimensions;
		if (row.width) dimensions = { ...dimensions, width: row.width };
		super.updateStyle(element, { dimensions });
	}
}
