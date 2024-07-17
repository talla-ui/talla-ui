import type { View } from "../../app/index.js";
import { StringConvertible } from "../../base/index.js";
import { UIComponent } from "../UIComponent.js";
import { UIFormContext } from "../UIFormContext.js";
import type { UIStyle } from "../UIStyle.js";

/**
 * A view class that represents a text field control
 *
 * @description A text field component is rendered on-screen as a single-line (default) or multi-line input field.
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export class UITextField extends UIComponent {
	/** Creates a new text field view instance */
	constructor(placeholder?: StringConvertible, value?: string) {
		super();
		this.placeholder = placeholder;
		this.value = value || "";

		// get and set form context value using `formContext` binding
		UIFormContext.bindFormContext(
			this,
			function (value) {
				this.value = value === undefined ? "" : String(value);
			},
			function () {
				return this.value;
			},
		);
	}

	/**
	 * Applies the provided preset properties to this object
	 * - This method is called automatically. Do not call this method after constructing a UI component.
	 */
	override applyViewPreset(
		preset: View.ExtendPreset<
			UIComponent,
			this,
			| "placeholder"
			| "value"
			| "type"
			| "multiline"
			| "formField"
			| "enterKeyHint"
			| "disableSpellCheck"
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
		if ("text" in (preset as any)) {
			preset.placeholder = (preset as any).text;
			delete (preset as any).text;
		}
		super.applyViewPreset(preset);
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

	/** Form context field name, used with {@link UIFormContext} */
	formField?: string = undefined;

	/** The input field type, defaults to `text` */
	type: UITextField.InputType | string = "text";

	/** An optional type that determines the text to be displayed on touch screen 'enter' keys, where supported */
	enterKeyHint?: UITextField.EnterKeyHintType | string;

	/** True if spell and/or grammar checks should be disabled, where supported */
	disableSpellCheck?: boolean;

	/** True if the entire text in the text field should be selected whenever it gains input focus */
	selectOnFocus?: boolean;

	/** True if user input should be disabled on this control */
	disabled = false;

	/** True if the text field should appear like a label */
	readOnly = false;

	/** Target width of the text field, in pixels or CSS length with unit */
	width?: string | number = undefined;

	/** The style to be applied to the text field */
	style?: UIStyle.TypeOrOverrides<UITextField.StyleType> = undefined;
}

export namespace UITextField {
	/** The type definition for styles applicable to {@link UITextField.style} */
	export type StyleType = UIComponent.DimensionsStyleType &
		UIComponent.DecorationStyleType &
		UIComponent.TextStyleType;

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
