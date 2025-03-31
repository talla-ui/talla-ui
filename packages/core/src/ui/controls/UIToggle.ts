import type { StringConvertible } from "@talla-ui/util";
import { type ViewBuilder, FormContext } from "../../app/index.js";
import type { UIStyle } from "../style/index.js";
import { UIRenderable } from "../UIRenderable.js";

/**
 * A view control that represents a checkbox or toggle input
 *
 * @description A toggle UI element is rendered on-screen as a checkbox or toggle control that can be switched on and off by the user.
 *
 * @online_docs Refer to the online documentation for more documentation on using this UI element class.
 */
export class UIToggle extends UIRenderable {
	/**
	 * Creates a new {@link ViewBuilder} instance for the current view class
	 * @see {@link View.getViewBuilder}
	 * @docgen {hide}
	 */
	static override getViewBuilder(
		preset: ViewBuilder.ExtendPreset<
			typeof UIRenderable,
			UIToggle,
			| "label"
			| "state"
			| "formField"
			| "disabled"
			| "width"
			| "type"
			| "style"
			| "labelStyle"
		> & {
			/** Event that's emitted when the toggle state has changed */
			onChange?: string;
		},
	) {
		// quietly change 'text' to label to support JSX tag content
		if ("text" in preset) {
			preset.label = preset.text as any;
			delete (preset as any).text;
		}
		return super.getViewBuilder(preset);
	}

	/** Creates a new toggle view object with the specified label */
	constructor(label?: StringConvertible, state?: boolean) {
		super();
		this.label = label;
		this.state = !!state;

		// get and set form context value using `formContext` binding
		FormContext.listen(
			this,
			function (value) {
				this.state = !!value;
			},
			function () {
				return this.state;
			},
		);
	}

	/** The current toggle state, true for toggle 'on' state */
	state;

	/** The toggle label to be displayed, if any */
	label?: StringConvertible;

	/** The toggle visual presentation type, defaults to checkbox */
	type: "none" | "checkbox" | "switch" = "checkbox";

	/** Form context field name, used with {@link FormContext} */
	formField?: string = undefined;

	/** True if user input should be disabled on this control */
	disabled = false;

	/** Target width of the toggle, in pixels or CSS length with unit */
	width?: string | number = undefined;

	/** The style to be applied to the toggle control as a whole */
	style?: UIToggle.StyleValue = undefined;

	/** The style to be applied to the toggle label */
	labelStyle?: UIToggle.LabelStyleValue = undefined;
}

export namespace UIToggle {
	/** A style object or overrides that can be applied to {@link UIToggle} */
	export type StyleValue =
		| UIStyle<UIToggle.StyleDefinition>
		| UIToggle.StyleDefinition
		| undefined;

	/** A style object or overrides that can be applied as label styles on {@link UIToggle} */
	export type LabelStyleValue =
		| UIStyle<UIToggle.LabelStyleDefinition>
		| UIToggle.LabelStyleDefinition
		| undefined;

	/** The type definition for styles applicable to {@link UIToggle.style} */
	export type StyleDefinition = UIRenderable.Dimensions & {
		/** Padding within control element (in pixels or CSS string, or separate offset values) */
		padding?: UIRenderable.Offsets;
		/** Opacity (0-1) */
		opacity?: number;
		/** Miscellaneous CSS attributes */
		css?: Partial<CSSStyleDeclaration>;
		/** Miscellaneous CSS class names (array) */
		cssClassNames?: string[];
	};

	/** The type definition for styles applicable to {@link UIToggle.labelStyle} */
	export type LabelStyleDefinition = UIRenderable.Decoration &
		UIRenderable.TextStyle;
}
