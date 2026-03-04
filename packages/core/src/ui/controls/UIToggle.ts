import { fmt, StringConvertible } from "@talla-ui/util";
import { FormState, ViewBuilder } from "../../app/index.js";
import { Binding, BindingOrValue } from "../../object/index.js";
import { StyleOverrides } from "../style/index.js";
import { UIElement } from "../UIElement.js";

/**
 * A view class that represents a checkbox or toggle input.
 * - Renders as a checkbox (default) or switch control that can be toggled on and off.
 * - Use the {@link UI.Toggle()} function to create toggles using a builder.
 *
 * @online_docs Refer to the online documentation for more information on using this UI element class.
 */
export class UIToggle extends UIElement {
	/** Creates a new toggle view object with the specified text. */
	constructor(text?: StringConvertible, value?: boolean) {
		super();
		this.text = text;
		this.value = !!value;
	}

	/** The current toggle state; true for the 'on' state. */
	value: boolean;

	/** The text to be displayed alongside the toggle. */
	text?: StringConvertible;

	/**
	 * The visual presentation type of the toggle.
	 * - Valid values are `checkbox`, `switch`, or `none`.
	 * - Defaults to `checkbox`.
	 */
	type: "none" | "checkbox" | "switch" = "checkbox";

	/** True if user input should be disabled on this control. */
	disabled = false;

	/** The style overrides for the toggle's text element. */
	textStyle?: StyleOverrides = undefined;
}

export namespace UIToggle {
	/** Default style names for toggle elements. */
	export type StyleName = "default" | "danger" | "success";

	/**
	 * Creates a view builder for a toggle (checkbox/switch) element.
	 * @param text The text to display next to the toggle, or a binding.
	 * @returns A builder object for configuring the toggle.
	 * @see {@link UIToggle}
	 */
	export function toggleBuilder(text?: BindingOrValue<StringConvertible>) {
		return new ToggleBuilder().text(text);
	}

	export namespace toggleBuilder {
		/**
		 * Creates a view builder for a toggle element with localizable or dynamic text.
		 * @param text The text to display, passed to {@link fmt()} or {@link Binding.fmt()}.
		 * @param args Additional bindings used to format the text dynamically.
		 * @returns A builder instance for chaining.
		 */
		export function fmt(text: StringConvertible, ...args: Binding[]) {
			return new ToggleBuilder().fmt(text, ...args);
		}
	}

	/**
	 * A builder class for creating {@link UIToggle} instances.
	 * - Returned by the {@link UI.Toggle()} function.
	 */
	export class ToggleBuilder extends UIElement.ElementBuilder<
		UIToggle,
		UIToggle.StyleName
	> {
		/** The initializer used to create each toggle instance. */
		readonly initializer = new ViewBuilder.Initializer(UIToggle);

		/**
		 * Sets the text displayed next to the toggle.
		 * @param text The text to display, or a binding.
		 * @returns The builder instance for chaining.
		 */
		text(text: BindingOrValue<StringConvertible | undefined>) {
			return this.setProperty("text", text);
		}

		/**
		 * Sets localizable or dynamic text for the toggle.
		 * @param text The text to display, passed to {@link fmt()} or {@link Binding.fmt()}.
		 * @param args Additional bindings used to format the text dynamically.
		 * @returns The builder instance for chaining.
		 */
		fmt(text: StringConvertible, ...args: Binding[]) {
			if (args.length === 0) return this.text(fmt(text));
			return this.text(Binding.fmt(text, ...args));
		}

		/**
		 * Sets the visual presentation type of the toggle.
		 * @param type The type (`checkbox`, `switch`, or `none`).
		 * @returns The builder instance for chaining.
		 */
		type(type: "none" | "checkbox" | "switch") {
			return this.setProperty("type", type);
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
			this.initializer.observeFormState(
				formState,
				formField,
				"value",
				(f) => !!f.values[formField],
			);
			return this;
		}

		/**
		 * Disables the toggle.
		 * @param disabled True to disable the toggle; defaults to true.
		 * @returns The builder instance for chaining.
		 */
		disabled(disabled: BindingOrValue<boolean> = true) {
			return this.setProperty("disabled", disabled);
		}

		/**
		 * Sets the toggle state.
		 * @param value The state (on/off) or a binding; converted to boolean.
		 * @returns The builder instance for chaining.
		 */
		value(value: BindingOrValue<any>) {
			return this.setProperty(
				"value",
				value instanceof Binding ? value.map((v) => !!v) : !!value,
			);
		}

		/**
		 * Applies styling to the toggle's text.
		 * - These overrides are applied on top of the `toggleText` named text style.
		 * @param textStyle A style overrides object for the text.
		 * @returns The builder instance for chaining.
		 */
		textStyle(textStyle?: BindingOrValue<StyleOverrides | undefined>) {
			return this.setProperty("textStyle", textStyle);
		}
	}
}
