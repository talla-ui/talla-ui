import { fmt, type StringConvertible } from "@talla-ui/util";
import { FormState, ViewBuilder } from "../../app/index.js";
import { Binding, BindingOrValue } from "../../object/index.js";
import { UIStyle } from "../style/index.js";
import type { UI } from "../UI.js";
import { UIElement } from "../UIElement.js";

/**
 * A view class that represents a text field control
 *
 * @description A text field UI element is rendered as a single-line (default) or multi-line input field.
 *
 * @online_docs Refer to the online documentation for more information on using this UI element class.
 */
export class UITextField extends UIElement {
	/** Creates a new text field view instance */
	constructor(placeholder?: StringConvertible, value?: string) {
		super();
		this.placeholder = placeholder;
		this.value = value || "";
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
	 * - This property can't be changed after rendering.
	 */
	multiline?: boolean;

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

	/**
	 * Add a two-way binding to a form state field.
	 * @param formState A form state object, or a binding to one (e.g. on an activity).
	 * @param formField The name of the form field to which the text field value should be bound.
	 */
	bindFormState(
		formState: BindingOrValue<FormState | undefined>,
		formField: string,
	) {
		let current: FormState | undefined;
		this.observe(formState as any, (formState) => {
			current = formState;
			if (formState) this.value = String(formState.values[formField] ?? "");
		});
		this.observe("value", (value) => {
			current?.set(formField, value);
		});
	}
}

export namespace UITextField {
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

export namespace UITextField {
	/**
	 * Creates a view builder for a text input field element
	 * @param placeholder The placeholder text to display when the field is empty, or a binding to a string value.
	 * @returns A builder object for configuring the text field.
	 * @see {@link UITextField}
	 */
	export function textFieldBuilder(
		placeholder?: BindingOrValue<StringConvertible>,
	) {
		return new TextFieldBuilder().placeholder(placeholder);
	}

	/**
	 * A builder class for creating `UITextField` instances.
	 * - Objects of this type are returned by the `UI.TextField()` function.
	 */
	export class TextFieldBuilder extends UIElement.ElementBuilder<UITextField> {
		/** The initializer that is used to create each text field instance */
		readonly initializer = new ViewBuilder.Initializer(UITextField);

		/**
		 * Sets the value of the text field, using {@link UITextField.value}.
		 * @param value The text value or a binding to a string value.
		 * @returns The builder instance for chaining.
		 */
		value(value: BindingOrValue<StringConvertible | undefined>) {
			return this.setProperty(
				"value",
				value instanceof Binding
					? value.map((v) =>
							v == null ? "" : typeof v === "string" ? v : fmt("{}", v),
						)
					: (value ?? ""),
			);
		}

		/**
		 * Adds a two-way binding to a form state field.
		 * @param formState A form state object, or a binding to one (e.g. on an activity).
		 * @param formField The name of the form field to which the text field value should be bound.
		 * @returns The builder instance for chaining.
		 */
		bindFormState(
			formState: BindingOrValue<FormState | undefined>,
			formField: string,
		) {
			this.initializer.finalize((view) => {
				view.bindFormState(formState, formField);
			});
			return this;
		}

		/**
		 * Sets the placeholder text for the text field, using {@link UITextField.placeholder}.
		 * @param placeholder The placeholder text, or a binding to a string value.
		 * @returns The builder instance for chaining.
		 */
		placeholder(placeholder?: BindingOrValue<StringConvertible>) {
			return this.setProperty("placeholder", placeholder);
		}

		/**
		 * Enables multi-line input, using {@link UITextField.multiline}.
		 * - Multi-line input fields don't have a default height. Provide a height using the `height` parameter, or use a predefined style that includes a height value to size the field.
		 * @param multiline If `true`, the text field will be multi-line. Defaults to `true`.
		 * @param height The height of the text field in pixels, or as a string with unit.
		 * @returns The builder instance for chaining.
		 */
		multiline(multiline = true, height?: string | number) {
			if (height != null) this.height(height);
			return this.setProperty("multiline", multiline);
		}

		/**
		 * Sets the input type of the text field, using {@link UITextField.type}.
		 * @param type The input type (e.g., "text", "password", "number").
		 * @returns The builder instance for chaining.
		 */
		type(type: UITextField.InputType | string) {
			return this.setProperty("type", type);
		}

		/**
		 * Sets the hint for the virtual keyboard's 'Enter' key, using {@link UITextField.enterKeyHint}.
		 * @param enterKeyHint The hint type (e.g., "go", "search", "send").
		 * @returns The builder instance for chaining.
		 */
		enterKeyHint(enterKeyHint: UITextField.EnterKeyHintType | string) {
			return this.setProperty("enterKeyHint", enterKeyHint);
		}

		/**
		 * Disables spell checking, using {@link UITextField.disableSpellCheck}.
		 * @param disableSpellCheck If `true`, spell check is disabled. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		disableSpellCheck(disableSpellCheck = true) {
			return this.setProperty("disableSpellCheck", disableSpellCheck);
		}

		/**
		 * Automatically trims whitespace from the input value, using {@link UITextField.trim}.
		 * @param trim If `true`, whitespace is trimmed. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		trim(trim = true) {
			return this.setProperty("trim", trim);
		}

		/**
		 * Selects all text in the field when it gains focus, using {@link UITextField.selectOnFocus}.
		 * @param selectOnFocus If `true`, text is selected on focus. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		selectOnFocus(selectOnFocus = true) {
			return this.setProperty("selectOnFocus", selectOnFocus);
		}

		/**
		 * Disables the text field, using {@link UITextField.disabled}.
		 * @param disabled If `true`, the text field is disabled. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		disabled(disabled: BindingOrValue<boolean> = true) {
			return this.setProperty("disabled", disabled);
		}

		/**
		 * Makes the text field read-only, using {@link UITextField.readOnly}.
		 * @param readOnly If `true`, the text field is read-only. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		readOnly(readOnly: BindingOrValue<boolean> = true) {
			return this.setProperty("readOnly", readOnly);
		}

		/**
		 * Applies a style to the text field
		 * @param style The name of a theme text field style, a {@link UIStyle} instance, a style options (overrides) object, or a binding.
		 * @returns The builder instance for chaining.
		 */
		textfieldStyle(
			style?: BindingOrValue<
				| UI.styles.TextfieldStyleName
				| UIStyle
				| UIStyle.StyleOptions
				| undefined
			>,
		) {
			return this.setStyleProperty(style, UIStyle.theme.textfield);
		}
	}
}
