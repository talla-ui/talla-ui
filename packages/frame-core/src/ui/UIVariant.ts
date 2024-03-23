import type { View } from "../app/index.js";
import { invalidArgErr } from "../errors.js";
import { UIComponent } from "./UIComponent.js";

/**
 * An object that includes predefined properties for a UI component
 * - UI component variants can be used with `ui` functions such as `ui.button(...)`, and in JSX tags for UI controls and containers.
 * - Variants can only be used with a specific UI component class, e.g. {@link UIButton}.
 * - To create a new variant for a view composite instead, use {@link ViewCompositeVariant}.
 */
export class UIVariant<T extends UIComponent> {
	/**
	 * Creates a new UI component variant object
	 * - The resulting instance can be used with `ui` functions such as `ui.button(...)`, and in JSX tags for UI controls and containers.
	 * @param type The UI component class that the variant will be used with, e.g {@link UIButton}
	 * @param preset The properties, bindings, and event handlers that will be preset on each object created with this variant
	 */
	constructor(type: new () => T, preset: Readonly<View.ViewPreset<T>>) {
		if (!(type.prototype instanceof UIComponent)) {
			throw invalidArgErr("type");
		}
		this.type = type;
		this.preset = Object.freeze({ ...preset });
	}

	/** The UI component class that the variant will be used with, e.g. {@link UIButton} */
	public readonly type: new () => T;

	/** The properties, bindings, and event handlers that will be preset on each object created with this variant */
	public readonly preset: Readonly<View.ViewPreset<T>>;
}
