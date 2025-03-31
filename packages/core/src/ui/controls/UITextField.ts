import type { StringConvertible } from "@talla-ui/util";
import { type ViewBuilder, FormContext } from "../../app/index.js";
import type { UIStyle } from "../style/index.js";
import { UIRenderable } from "../UIRenderable.js";

/**
 * A view class that represents a text field control
 *
 * @description A text field UI element is rendered on-screen as a single-line (default) or multi-line input field.
 *
 * @online_docs Refer to the online documentation for more documentation on using this UI element class.
 */
export class UITextField extends UIRenderable {
	/**
	 * Creates a new {@link ViewBuilder} instance for the current view class
	 * @see {@link View.getViewBuilder}
	 * @docgen {hide}
	 */
	static override getViewBuilder(
		preset: ViewBuilder.ExtendPreset<
			typeof UIRenderable,
			UITextField,
			| "placeholder"
			| "value"
			| "type"
			| "multiline"
			| "formField"
			| "enterKeyHint"
			| "disableSpellCheck"
			| "trim"
			| "selectOnFocus"
			| "disabled"
			| "readOnly"
			| "width"
			| "style"
		> & {
			/** Event that's emitted after the text field has updated and input focus lost */
			onChange?: string;
			/** Event that's emitted when the text field is updated */
			onInput?: string;
			/** Event that's emitted when the user performs a clipboard copy action */
			onCopy?: string;
			/** Event that's emitted when the user performs a clipboard cut action */
			onCut?: string;
			/** Event that's emitted when the user performs a clipboard paste action */
			onPaste?: string;
		},
	) {
		// quietly change 'text' to placeholder to support JSX tag content
		if ("text" in preset) {
			if (!("placeholder" in preset)) preset.placeholder = preset.text as any;
			delete (preset as any).text;
		}
		return super.getViewBuilder(preset);
	}

	/** Creates a new text field view instance */
	constructor(placeholder?: StringConvertible, value?: string) {
		super();
		this.placeholder = placeholder;
		this.value = value || "";

		// get and set form context value using `formContext` binding
		FormContext.listen(
			this,
			function (value) {
				this.value = value === undefined ? "" : String(value);
			},
			function () {
				return this.trim ? this.value.trim() : this.value;
			},
		);
	}

	/**
	 * The current input value
	 * - This field can be preset to initialize the input text.
	 * - This field can be bound, to update and/or initialize the text field with a bound property value.
	 */
	value: string;

	/** The text field placeholder text */
	placeholder?: StringConvertible;

	/**
	 * True if multiline input mode should be enabled
	 * - Setting this property to true also suppresses the EnterKeyPress event.
	 * - This property can't be changed after rendering.
	 */
	multiline?: boolean;

	/** Form context field name, used with {@link FormContext} */
	formField?: string = undefined;

	/**
	 * The input field type, defaults to `text`
	 * - The accepted values for this property are platform dependent. Examples that work well in most environments include `text`, `password`, `email`, `url`, `tel`, and `search`.
	 * - For numeric input, the `number` type often changes alignment, validation, and adds built-in UI controls (a 'spinner' with up and down buttons). Since this is often not desirable, the special `numeric` and `decimal` types can be used with the web (DOM) renderer to control the touch screen keyboard type without changing the look and feel of the input element itself.
	 */
	type: UITextField.InputType | string = "text";

	/** An optional type that determines the text to be displayed on touch screen 'enter' keys, where supported */
	enterKeyHint?: UITextField.EnterKeyHintType | string;

	/** True if spell and/or grammar checks should be disabled, where supported */
	disableSpellCheck?: boolean;

	/** True if the text field should automatically trim whitespace from the input value */
	trim?: boolean;

	/** True if the entire text in the text field should be selected whenever it gains input focus */
	selectOnFocus?: boolean;

	/** True if user input should be disabled on this control */
	disabled = false;

	/** True if the text field should appear like a label */
	readOnly = false;

	/** Target width of the text field, in pixels or CSS length with unit */
	width?: string | number = undefined;

	/** The style to be applied to the text field */
	style?: UITextField.StyleValue = undefined;
}

export namespace UITextField {
	/** A style object or overrides that can be applied to {@link UITextField} */
	export type StyleValue =
		| UIStyle<UITextField.StyleDefinition>
		| UITextField.StyleDefinition
		| undefined;

	/** The type definition for styles applicable to {@link UITextField.style} */
	export type StyleDefinition = UIRenderable.Dimensions &
		UIRenderable.Decoration &
		UIRenderable.TextStyle;

	/** An identifier for a text field input type */
	export type InputType = "text" | "password" | "number" | "date" | "color";

	/** An identifier for a virtual keyboard 'enter' button type, used only on some devices */
	export type EnterKeyHintType =
		| "enter"
		| "done"
		| "go"
		| "next"
		| "previous"
		| "search"
		| "send";
}
