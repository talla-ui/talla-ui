import { ViewClass, ViewComposite } from "../../app/index.js";
import type { ManagedEvent } from "../../base/index.js";
import type { UIComponent } from "../UIComponent.js";

/**
 * A view composite that automatically creates and unlinks the contained view
 *
 * @description A conditional component creates and renders its contained content based on the value of the {@link state} property.
 *
 * **JSX tag:** `<conditional>`
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export class UIConditional extends ViewComposite {
	/**
	 * Creates a preset controller class with the specified property values, bindings, and event handlers
	 * @param preset Property values, bindings, and event handlers
	 * @returns A class that can be used to create instances of this view class with the provided property values, bindings, and event handlers
	 */
	static with(
		preset: UIComponent.ViewPreset<ViewComposite, UIConditional, "state">,
		Body: ViewClass,
	): typeof UIConditional {
		return class PresetView extends this {
			constructor() {
				super();
				this._ViewBody = Body;
				this.applyViewPreset({ ...preset });
			}
		};
	}

	constructor() {
		super();

		// add state accessor (observable)
		let state = false;
		Object.defineProperty(this, "state", {
			configurable: true,
			get() {
				return state;
			},
			set(this: UIConditional, v) {
				state = v;
				if (this._ViewBody && !!this.body !== !!v) {
					this.body = v ? new this._ViewBody() : undefined;
				}
			},
		});
	}

	protected override delegateViewEvent(event: ManagedEvent) {
		return super.delegateViewEvent(event) || !!this.emit(event);
	}

	/**
	 * The current state of this conditional view
	 * - The content view is created and rendered only if this property is set to true.
	 * - The content view is _unlinked_, not just hidden, when this property is set to false.
	 */
	declare state: boolean;

	/** Conditional view class, preset by with() */
	private declare _ViewBody?: ViewClass;
}
