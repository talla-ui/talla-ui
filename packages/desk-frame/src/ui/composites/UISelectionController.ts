import { ViewClass, ViewComposite } from "../../app/index.js";
import { ManagedEvent } from "../../core/index.js";
import { UIComponent } from "../UIComponent.js";

/**
 * A view composite that manages the selection state of UI components within the contained view
 *
 * @description A selection controller component manages selection states within its contained content, so that only one component can be selected at any time.
 *
 * **JSX tag:** `<selection>`
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export class UISelectionController extends ViewComposite {
	/**
	 * Creates a preset controller class with the specified property values, bindings, and event handlers
	 * @param preset Property values, bindings, and event handlers
	 * @returns A class that can be used to create instances of this view class with the provided property values, bindings, and event handlers
	 */
	static with(preset: {}, Body: ViewClass): typeof UISelectionController;
	static with(Body: ViewClass): typeof UISelectionController;
	static with(preset?: ViewClass | any, Body?: ViewClass) {
		if (typeof preset === "function") {
			Body = preset;
			preset = undefined;
		}
		return class PresetView extends this {
			protected override createView() {
				return new Body!();
			}
		};
	}

	/**
	 * Select event handler
	 * - This method updates {@link selectedComponent}, and emits a Deselect event on the previously selected UI component.
	 */
	onSelect(e: ManagedEvent) {
		if (
			e.source !== this.selectedComponent &&
			e.source instanceof UIComponent
		) {
			// remember this UI component, deselect old one if any
			let old = this.selectedComponent;
			this.selectedComponent = e.source;
			if (old && !old.isUnlinked()) {
				old.emit(new ManagedEvent("Deselect", old, undefined, undefined, e));
			}
		}
		return true;
	}

	/**
	 * Deselect event handler
	 * - This method clears {@link selectedComponent} if the Deselect event originated from the currently selected UI component.
	 */
	onDeselect(e: ManagedEvent) {
		if (e.source === this.selectedComponent) {
			this.selectedComponent = undefined;
		}
		return true;
	}

	protected override delegateViewEvent(event: ManagedEvent) {
		return super.delegateViewEvent(event) || !!this.emit(event);
	}

	/** The currently selected UI component, if any */
	selectedComponent?: UIComponent;
}
