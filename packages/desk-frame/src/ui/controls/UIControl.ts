import { UIStyle } from "../UIStyle.js";
import { UIComponent } from "../UIComponent.js";

/** Empty array, used for findViewContent */
const _emptyArray: any[] = Object.freeze([]) as any;

/**
 * A base view class that represents a UI control
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export abstract class UIControl extends UIComponent {
	/**
	 * Applies the provided preset properties to this object
	 * - This method is called automatically. Do not call this method after constructing a UI component.
	 */
	override applyViewPreset(
		preset: UIComponent.ViewPreset<
			UIComponent,
			this,
			"disabled" | "shrinkwrap"
		> & {
			/** Text style options (overrides) */
			textStyle?: UIStyle.Definition.TextStyle;
			/** Options for the appearance of this control (overrides) */
			decoration?: UIStyle.Definition.Decoration;
		},
	) {
		let textStyle = preset.textStyle;
		delete preset.textStyle;
		let decoration = preset.decoration;
		delete preset.decoration;

		super.applyViewPreset(preset);

		// apply style overrides
		if (textStyle) this.textStyle = { ...this.textStyle, ...textStyle };
		if (decoration) this.decoration = { ...this.decoration, ...decoration };
	}

	protected override applyStyle(style: UIStyle) {
		super.applyStyle(style);
		this.decoration = style.getStyles().decoration;
		this.textStyle = style.getStyles().textStyle;
	}

	/** Style definitions related to the appearance of text */
	textStyle!: Readonly<UIStyle.Definition.TextStyle>;

	/** Style definitions related to the appearance of this control */
	decoration!: Readonly<UIStyle.Definition.Decoration>;

	/** True if user input should be disabled on this control */
	disabled = false;

	/**
	 * True if this control should be shrunk along the primary axis of the container to occupy as little space as possible
	 * - Set this property to false to expand the control along the primary axis of the container.
	 * - Set this property to `"auto"` to respect the `grow` property of {@link UIComponent.dimensions}.
	 * - This property defaults to true on {@link UIControl} but may be overridden by individual controls.
	 */
	shrinkwrap: boolean | "auto" = true;

	/** Implementation of {@link View.findViewContent()} that always returns an empty array */
	override findViewContent() {
		return _emptyArray;
	}
}
