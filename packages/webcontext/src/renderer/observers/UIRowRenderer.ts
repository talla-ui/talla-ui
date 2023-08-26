import { ManagedChangeEvent, UIRow } from "desk-frame";
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

	override updateStyle(element: HTMLElement) {
		let row = this.observed;
		if (!row) return;
		let dimensions = row.dimensions;
		if (row.height) dimensions = { ...dimensions, height: row.height };
		super.updateStyle(element, { dimensions });
	}
}
