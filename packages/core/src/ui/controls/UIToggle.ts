import { fmt, StringConvertible } from "@talla-ui/util";
import { FormContext, ViewBuilder } from "../../app/index.js";
import { bind, Binding, BindingOrValue } from "../../object/index.js";
import { UIStyle } from "../style/index.js";
import type { UI } from "../UI.js";
import { UIViewElement } from "../UIViewElement.js";

/**
 * A view control that represents a checkbox or toggle input
 *
 * @description A toggle UI element is rendered as a checkbox or toggle control that can be switched on and off by the user.
 *
 * @online_docs Refer to the online documentation for more information on using this UI element class.
 */
export class UIToggle extends UIViewElement {
	/** Creates a new toggle view object with the specified label */
	constructor(label?: StringConvertible, state?: boolean) {
		super();
		this.label = label;
		this.state = !!state;
	}

	/** The current toggle state, true for toggle 'on' state */
	state: boolean;

	/** The toggle label to be displayed, if any */
	label?: StringConvertible;

	/** The toggle visual presentation type, defaults to checkbox */
	type: "none" | "checkbox" | "switch" = "checkbox";

	/** True if user input should be disabled on this control */
	disabled = false;

	/** Label style definition (overrides), if any */
	labelStyle?: UIStyle.StyleOptions = undefined;
}

export namespace UIToggle {
	/**
	 * Creates a view builder for a toggle (checkbox/switch) element
	 * @param label The text label to display next to the toggle, or a binding to a string value.
	 * @returns A builder object for configuring the toggle.
	 * @see {@link UIToggle}
	 */
	export function toggleBuilder(label?: BindingOrValue<StringConvertible>) {
		return new ToggleBuilder().label(label);
	}

	export namespace toggleBuilder {
		/**
		 * Creates a view builder for a toggle (checkbox/switch) element with a localizable or dynamic text label.
		 * @param text The text to display, passed to {@link fmt()} or {@link bind.fmt()}
		 * @param args Additional bindings, used to format the text dynamically
		 * @returns A builder instance for chaining.
		 */
		export function fmt(text: StringConvertible, ...args: Binding[]) {
			return new ToggleBuilder().fmt(text, ...args);
		}
	}

	/**
	 * A builder class for creating `UIToggle` instances.
	 * - Objects of this type are returned by the `UI.Toggle()` function.
	 */
	export class ToggleBuilder extends UIViewElement.ElementBuilder<UIToggle> {
		/** The initializer that is used to create each toggle instance */
		readonly initializer = new ViewBuilder.Initializer(UIToggle);

		/**
		 * Sets the text label for the toggle, using {@link UIToggle.label}.
		 * @param label The text to display next to the toggle, or a binding to a string value.
		 * @returns The builder instance for chaining.
		 */
		label(label?: StringConvertible) {
			return this.setProperty("label", label);
		}

		/**
		 * Sets a localizable or dynamic text for the toggle label.
		 * @param text The text to display, passed to {@link fmt()} or {@link bind.fmt()}
		 * @param args Additional bindings, used to format the text dynamically
		 * @returns The builder instance for chaining.
		 */
		fmt(text: StringConvertible, ...args: Binding[]) {
			if (args.length === 0) return this.label(fmt(text));
			return this.label(bind.fmt(text, ...args));
		}

		/**
		 * Sets the visual presentation of the toggle, using {@link UIToggle.type}.
		 * @param type The type of the toggle (`checkbox`, `switch`, or `none`).
		 * @returns The builder instance for chaining.
		 */
		type(type: "none" | "checkbox" | "switch") {
			return this.setProperty("type", type);
		}

		/**
		 * Binds the text field to a form context field, using {@link FormContext.listen}.
		 * @param formField The name of the form field.
		 * @returns The builder instance for chaining.
		 */
		bindFormField(formField: string) {
			this.initializer.initialize(function (view) {
				FormContext.listen(
					view,
					formField,
					(value) => {
						view.state = !!value;
					},
					() => view.state,
				);
			});
			return this;
		}

		/**
		 * Disables the toggle, using {@link UIToggle.disabled}.
		 * @param disabled If `true`, the toggle is disabled. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		disabled(disabled: BindingOrValue<boolean> = true) {
			return this.setProperty("disabled", disabled);
		}

		/**
		 * Sets the state of the toggle, using {@link UIToggle.state}.
		 * @param state The state (on/off) or a binding to a boolean value.
		 * @returns The builder instance for chaining.
		 */
		state(state: BindingOrValue<boolean>) {
			return this.setProperty("state", state);
		}

		/**
		 * Applies a style to the toggle
		 * @param style The name of a theme toggle style, a {@link UIStyle} instance, a style options (overrides) object, or a binding.
		 * @returns The builder instance for chaining.
		 */
		toggleStyle(
			style?: BindingOrValue<
				UI.styles.ToggleStyleName | UIStyle | UIStyle.StyleOptions | undefined
			>,
		) {
			return this.setStyleProperty(style, UIStyle.theme.toggle);
		}

		/**
		 * Applies styling to the toggle's label, using {@link UIToggle.labelStyle}.
		 * @param labelStyle A style options object for the label.
		 * @returns The builder instance for chaining.
		 */
		labelStyle(labelStyle?: BindingOrValue<UIStyle.StyleOptions | undefined>) {
			return this.setProperty("labelStyle", labelStyle);
		}

		/**
		 * Intercepts the `Change` event and re-emits it with a different name.
		 * @param alias The new event name to emit.
		 * @param data The data properties to add to the alias event, if any
		 * @returns The builder instance for chaining.
		 */
		emit(alias: string, data?: Record<string, unknown>) {
			this.initializer.intercept("Change", alias, data);
			return this;
		}
	}
}
