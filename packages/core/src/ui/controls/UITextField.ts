import { fmt, type StringConvertible } from "@talla-ui/util";
import { FormState, ViewBuilder } from "../../app/index.js";
import { Binding, BindingOrValue } from "../../object/index.js";
import { UIElement } from "../UIElement.js";

/**
 * A view class that represents a text field control.
 * - Renders as a single-line (default) or multi-line input field.
 * - Use the {@link UI.TextField()} function to create text fields using a builder.
 *
 * @online_docs Refer to the online documentation for more information on using this UI element class.
 */
export class UITextField extends UIElement {
	/** Creates a new text field view instance. */
	constructor(placeholder?: StringConvertible, value?: string) {
		super();
		this.placeholder = placeholder;
		this.value = value || "";
	}

	/**
	 * The current input value.
	 * - Can be preset to initialize the input text.
	 * - Can be bound to update and/or initialize the text field with a bound property value.
	 */
	value: string;

	/** The placeholder text displayed when the field is empty. */
	placeholder?: StringConvertible;

	/**
	 * True if multiline input mode should be enabled.
	 * - This property cannot be changed after rendering.
	 */
	multiline?: boolean;

	/**
	 * The input field type.
	 * - Defaults to `text`.
	 * - Accepted values are platform dependent; common values include `text`, `password`, `email`, `url`, `tel`, and `search`.
	 * - For numeric input, the `number` type often changes alignment and adds spinner controls; use `numeric` or `decimal` with the web renderer to control the keyboard type without changing the input's appearance.
	 */
	type: UITextField.InputType | string = "text";

	/**
	 * The text to display on the virtual keyboard's 'enter' key.
	 * - Supported on some platforms only.
	 */
	enterKeyHint?: UITextField.EnterKeyHintType | string;

	/** True if spell and/or grammar checks should be disabled, where supported. */
	disableSpellCheck?: boolean;

	/** True if the text field should automatically trim whitespace from the input value. */
	trim?: boolean;

	/** True if all text should be selected whenever the field gains input focus. */
	selectOnFocus?: boolean;

	/** True if user input should be disabled on this control. */
	disabled = false;

	/** True if the text field should appear read-only. */
	readOnly = false;

	/**
	 * A set of flags that determine the text field's visual style.
	 * - The variant can be set using `UI.TextField()` builder methods, e.g. {@link UITextField.TextFieldBuilder.ghost ghost()}.
	 * - When updating the variant at runtime, always set this property to a new object rather than mutating the existing object.
	 */
	textFieldVariant: Record<string, boolean | undefined> = {};
}

export namespace UITextField {
	/** An identifier for a text field input type. */
	export type InputType = "text" | "password" | "number" | "date" | "color";

	/** An identifier for a virtual keyboard 'enter' button type. */
	export type EnterKeyHintType =
		| "enter"
		| "done"
		| "go"
		| "next"
		| "previous"
		| "search"
		| "send";

	/**
	 * Creates a view builder for a text input field element.
	 * @param placeholder The placeholder text to display when the field is empty, or a binding.
	 * @returns A builder object for configuring the text field.
	 * @see {@link UITextField}
	 */
	export function textFieldBuilder(
		placeholder?: BindingOrValue<StringConvertible>,
	) {
		return new TextFieldBuilder().placeholder(placeholder);
	}

	/**
	 * A builder class for creating {@link UITextField} instances.
	 * - Returned by the {@link UI.TextField()} function.
	 */
	export class TextFieldBuilder extends UIElement.ElementBuilder<UITextField> {
		/** The initializer used to create each text field instance. */
		readonly initializer = new ViewBuilder.Initializer(UITextField);

		/**
		 * Sets the text field value.
		 * @param value The text value or a binding.
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
		 * @param formState A binding to a form state object.
		 * @param formField The name of the form field to bind to.
		 * @returns The builder instance for chaining.
		 */
		formStateValue(
			formState: Binding<FormState | undefined>,
			formField: string,
		) {
			this.initializer.observeFormState(formState, formField, "value", (f) =>
				String(f.values[formField] ?? ""),
			);
			return this;
		}

		/**
		 * Sets the placeholder text.
		 * @param placeholder The placeholder text, or a binding.
		 * @returns The builder instance for chaining.
		 */
		placeholder(placeholder: BindingOrValue<StringConvertible | undefined>) {
			return this.setProperty("placeholder", placeholder);
		}

		/**
		 * Enables multi-line input.
		 * - Multi-line fields have no default height; provide one using the `height` parameter or a predefined style.
		 * @param multiline True to enable multi-line input; defaults to true.
		 * @param height The height of the text field in pixels, or as a string with unit.
		 * @returns The builder instance for chaining.
		 */
		multiline(multiline = true, height?: string | number) {
			if (height != null) this.height(height);
			return this.setProperty("multiline", multiline);
		}

		/**
		 * Sets the input type of the text field.
		 * @param type The input type (e.g. `text`, `password`, `number`).
		 * @returns The builder instance for chaining.
		 */
		type(type: UITextField.InputType | string) {
			return this.setProperty("type", type);
		}

		/**
		 * Sets the hint for the virtual keyboard's 'Enter' key.
		 * @param enterKeyHint The hint type (e.g. `go`, `search`, `send`).
		 * @returns The builder instance for chaining.
		 */
		enterKeyHint(enterKeyHint: UITextField.EnterKeyHintType | string) {
			return this.setProperty("enterKeyHint", enterKeyHint);
		}

		/**
		 * Disables spell checking.
		 * @param disableSpellCheck True to disable spell check; defaults to true.
		 * @returns The builder instance for chaining.
		 */
		disableSpellCheck(disableSpellCheck = true) {
			return this.setProperty("disableSpellCheck", disableSpellCheck);
		}

		/**
		 * Enables automatic whitespace trimming.
		 * @param trim True to trim whitespace; defaults to true.
		 * @returns The builder instance for chaining.
		 */
		trim(trim = true) {
			return this.setProperty("trim", trim);
		}

		/**
		 * Selects all text when the field gains focus.
		 * @param selectOnFocus True to select text on focus; defaults to true.
		 * @returns The builder instance for chaining.
		 */
		selectOnFocus(selectOnFocus = true) {
			return this.setProperty("selectOnFocus", selectOnFocus);
		}

		/**
		 * Disables the text field.
		 * @param disabled True to disable the text field; defaults to true.
		 * @returns The builder instance for chaining.
		 */
		disabled(disabled: BindingOrValue<boolean> = true) {
			return this.setProperty("disabled", disabled);
		}

		/**
		 * Makes the text field read-only.
		 * @param readOnly True to make the text field read-only; defaults to true.
		 * @returns The builder instance for chaining.
		 */
		readOnly(readOnly: BindingOrValue<boolean> = true) {
			return this.setProperty("readOnly", readOnly);
		}

		/**
		 * Enables (or disables) the specified text field style variant.
		 * - Standard text field style variants can be enabled using specific builder methods, e.g. {@link ghost()}.
		 * @param variant The variant name.
		 * @param enabled True to enable, or a binding; defaults to true.
		 * @returns The builder instance for chaining.
		 */
		textFieldVariant(
			variant: string,
			enabled: BindingOrValue<boolean | undefined> = true,
		) {
			this.initializer.update(enabled, function (value) {
				this.textFieldVariant = {
					...this.textFieldVariant,
					[variant]: !!value || undefined,
				};
			});
			return this;
		}

		/**
		 * Enables the ghost style variant (borderless/transparent).
		 * @param enabled True to enable, or a binding; defaults to true.
		 * @returns The builder instance for chaining.
		 */
		ghost(enabled: BindingOrValue<boolean | undefined> = true) {
			return this.textFieldVariant("ghost", enabled);
		}

		/**
		 * Enables the ghost style variant (borderless/transparent, no interaction highlight).
		 * @param enabled True to enable, or a binding; defaults to true.
		 * @returns The builder instance for chaining.
		 */
		bare(enabled: BindingOrValue<boolean | undefined> = true) {
			return this.textFieldVariant("bare", enabled);
		}

		/**
		 * Enables the invalid style variant ('danger' border color).
		 * @param enabled True to enable, or a binding; defaults to true.
		 * @returns The builder instance for chaining.
		 */
		invalid(enabled: BindingOrValue<boolean | undefined> = true) {
			return this.textFieldVariant("invalid", enabled);
		}
	}

	/**
	 * Creates a view builder for a multi-line text area element.
	 * @param placeholder The placeholder text to display when the field is empty, or a binding.
	 * @returns A builder object for configuring the text area.
	 * @see {@link UITextField}
	 */
	export function textAreaBuilder(
		placeholder?: BindingOrValue<StringConvertible>,
	) {
		return new TextFieldBuilder().placeholder(placeholder).multiline();
	}
}
