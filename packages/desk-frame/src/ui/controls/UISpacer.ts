import { UIComponent } from "../UIComponent.js";
import { UIStyle } from "../UIStyle.js";
import { UIControl } from "./UIControl.js";

/**
 * A view class that represents a flexible control without any content
 *
 * @description A spacer component is rendered on-screen as an empty placeholder.
 *
 * **JSX tag:** `<spacer>`
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export class UISpacer extends UIControl {
	/**
	 * Creates a preset spacer class with the specified height
	 * @param height The spacer height, in pixels or CSS length with unit
	 * @param shrinkwrap False if the spacer should expand beyond the specified height, where possible, within a vertical container component; defaults to true
	 * @returns A class that can be used to create instances of this spacer class with the provided height
	 */
	static withHeight(height?: string | number, shrinkwrap = true) {
		return this.with({ height, shrinkwrap });
	}

	/**
	 * Creates a preset spacer class with the specified width
	 * @param height The spacer width, in pixels or CSS length with unit
	 * @param shrinkwrap False if the spacer should expand beyond the specified width, where possible, within a horizontal container component; defaults to true
	 * @returns A class that can be used to create instances of this spacer class with the provided width
	 */
	static withWidth(width?: string | number, shrinkwrap = true) {
		return this.with({ width, shrinkwrap });
	}

	/**
	 * Applies the provided preset properties to this object
	 * - This method is called automatically. Do not call this method after constructing a UI component.
	 */
	override applyViewPreset(
		preset: UIComponent.ViewPreset<UIControl> & {
			/** Spacer width (in pixels or string with unit) */
			width?: string | number;
			/** Spacer height (in pixels or string with unit) */
			height?: string | number;
		},
	) {
		if (preset.height !== undefined) {
			preset = {
				...preset,
				height: undefined,
				shrinkwrap: preset.shrinkwrap == null ? true : preset.shrinkwrap,
				dimensions: {
					...preset.dimensions,
					grow: 0,
					minHeight: preset.height,
				},
			};
			delete preset.height;
		}
		if (preset.width !== undefined) {
			preset = {
				...preset,
				width: undefined,
				shrinkwrap: preset.shrinkwrap == null ? true : preset.shrinkwrap,
				dimensions: {
					...preset.dimensions,
					grow: 0,
					minWidth: preset.width,
				},
			};
			delete preset.width;
		}
		super.applyViewPreset(preset);
	}

	/** Creates a new spacer view object */
	constructor() {
		super();
		this.style = UIStyle.Control;

		// default shrinkwrap to false
		this.shrinkwrap = false;
	}
}
