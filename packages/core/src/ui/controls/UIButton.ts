import { fmt, StringConvertible } from "@talla-ui/util";
import { ViewBuilder } from "../../app/index.js";
import {
	bind,
	Binding,
	BindingOrValue,
	isBinding,
} from "../../object/index.js";
import { UIIconResource, UIStyle } from "../style/index.js";
import type { UI } from "../UI.js";
import { UIViewElement } from "../UIViewElement.js";
import { UILabel } from "./UILabel.js";

/**
 * A view class that represents a button control
 *
 * @description A button UI element is rendered as a button control.
 *
 * @online_docs Refer to the online documentation for more information on using this UI element class.
 */
export class UIButton extends UIViewElement {
	/** Creates a new button view object with the specified label */
	constructor(text?: StringConvertible) {
		super();
		this.text = text;
	}

	/** The button label to be displayed */
	text?: StringConvertible;

	/** The button icon to be displayed */
	icon?: UIIconResource = undefined;

	/** Options for displaying the button icon */
	iconStyle?: UILabel.IconStyle = undefined;

	/** Direction of chevron icon to be placed at the far end of the button, if any */
	chevron?: "up" | "down" | "next" | "back" = undefined;

	/** Options for displaying the chevron icon */
	chevronStyle?: UILabel.IconStyle = undefined;

	/**
	 * Navigation target to navigate to when this button is clicked
	 * - If this property is set, the button will emit a `Navigate` event when clicked. This event is handled automatically by a containing {@link Activity}, if any. If the target starts with a dot, it's treated as a relative path to the current activity's navigation path.
	 */
	navigateTo?: StringConvertible;

	/**
	 * The current visual selection state
	 * - This property is not set automatically. It can be set manually, or bound to select and deselect the button based on the current application state.
	 */
	pressed?: boolean = undefined;

	/**
	 * An option value that's associated with this button
	 * - This property isn't rendered in any way, but it may be used to find out which button was clicked in a group of buttons, either using the property directly or from the event data property that's added to events emitted by the button.
	 */
	value?: unknown;

	/** True to disable keyboard focus (e.g. Tab key) for this button */
	disableKeyboardFocus?: boolean;

	/** True if user input should be disabled on this control */
	disabled = false;

	/**
	 * Returns the navigation target for this button
	 * - This method returns the value of the {@link UIButton.navigateTo} property, and is called automatically by {@link Activity.onNavigate()}.
	 */
	getNavigationTarget() {
		return this.navigateTo;
	}
}

export namespace UIButton {
	/**
	 * Creates a view builder for a button element
	 * @param text The text label for the button, or a binding to a string value.
	 * @returns A builder object for configuring the button.
	 * @see {@link UIButton}
	 */
	export function buttonBuilder(text?: BindingOrValue<StringConvertible>) {
		return new ButtonBuilder().text(text);
	}

	export namespace buttonBuilder {
		/**
		 * Creates a view builder for a button element with a localizable or dynamic text label.
		 * @param text The text to display, passed to {@link fmt()} or {@link bind.fmt()}
		 * @param args Additional bindings, used to format the text dynamically
		 * @returns A builder instance for chaining.
		 */
		export function fmt(text: StringConvertible, ...args: Binding[]) {
			return new ButtonBuilder().fmt(text, ...args);
		}
	}

	/**
	 * A builder class for creating `UIButton` instances.
	 * - Objects of this type are returned by the `UI.Button()` function.
	 */
	export class ButtonBuilder extends UIViewElement.ElementBuilder<UIButton> {
		/** The initializer that is used to create each button instance */
		readonly initializer = new ViewBuilder.Initializer(UIButton);

		/**
		 * Sets the text label for the button, using {@link UIButton.text}.
		 * @param text The text to display, or a binding to a string value.
		 * @returns The builder instance for chaining.
		 */
		text(text?: BindingOrValue<StringConvertible>) {
			return this.setProperty("text", text);
		}

		/**
		 * Sets a localizable or dynamic text label for the button.
		 * @param text The text to display, passed to {@link fmt()} or {@link bind.fmt()}
		 * @param args Additional bindings, used to format the text dynamically
		 * @returns The builder instance for chaining.
		 */
		fmt(text: StringConvertible, ...args: Binding[]) {
			if (args.length === 0) return this.text(fmt(text));
			return this.text(bind.fmt(text, ...args));
		}

		/**
		 * Sets the icon for the button, using {@link UIButton.icon}.
		 * @param icon An icon resource, a theme icon name, or a binding to an icon.
		 * @param iconStyle Styling options for the icon, or only the icon size (in pixels).
		 * @returns The builder instance for chaining.
		 */
		icon(
			icon: UI.IconName | BindingOrValue<UIIconResource | string | undefined>,
			iconStyle?: BindingOrValue<UILabel.IconStyle> | number,
		) {
			if (iconStyle != null) {
				this.initializer.update(iconStyle, function (value) {
					this.iconStyle = typeof value === "number" ? { size: value } : value;
				});
			}
			if (typeof icon === "string") {
				icon = UIIconResource.theme.ref(icon as any);
			} else if (isBinding(icon)) {
				icon = icon.map((value) =>
					typeof value === "string"
						? UIIconResource.theme.ref(value as any)
						: value,
				);
			}
			return this.setProperty("icon", icon);
		}

		/**
		 * Adds a chevron icon to the button, using {@link UIButton.chevron}.
		 * @param chevron The direction of the chevron (`up`, `down`, `next`, `back`).
		 * @param chevronStyle Styling options for the chevron, or only the icon size (in pixels).
		 * @returns The builder instance for chaining.
		 */
		chevron(
			chevron: BindingOrValue<"up" | "down" | "next" | "back">,
			chevronStyle?: BindingOrValue<UILabel.IconStyle> | number,
		) {
			if (chevronStyle != null) {
				this.initializer.update(chevronStyle, function (value) {
					this.chevronStyle =
						typeof value === "number" ? { size: value } : value;
				});
			}
			return this.setProperty("chevron", chevron);
		}

		/**
		 * Disables the button, using {@link UIButton.disabled}.
		 * @param disabled If `true`, the button is disabled. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		disabled(disabled: BindingOrValue<boolean> = true) {
			return this.setProperty("disabled", disabled);
		}

		/**
		 * Sets the visual pressed state of the button, using {@link UIButton.pressed}.
		 * @param pressed If `true`, the button appears pressed. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		pressed(pressed: BindingOrValue<boolean> = true) {
			return this.setProperty("pressed", pressed);
		}

		/**
		 * Associates an arbitrary value with the button, using {@link UIButton.value}.
		 * @param value The value to associate.
		 * @returns The builder instance for chaining.
		 */
		value(value?: BindingOrValue<unknown>) {
			return this.setProperty("value", value);
		}

		/**
		 * Applies a style to the button
		 * @param style The name of a theme button style, a {@link UIStyle} instance, a style options (overrides) object, or a binding.
		 * @returns The builder instance for chaining.
		 */
		buttonStyle(
			style?: BindingOrValue<
				UI.styles.ButtonStyleName | UIStyle | UIStyle.StyleOptions | undefined
			>,
		) {
			return this.setStyleProperty(style, UIStyle.theme.button);
		}

		/**
		 * Sets a navigation target for the button, making it behave like a link.
		 * @param navigateTo A path string
		 * @returns The builder instance for chaining.
		 */
		navigateTo(navigateTo?: BindingOrValue<StringConvertible>) {
			this.setProperty("accessibleRole", "link");
			return this.setProperty("navigateTo", navigateTo);
		}

		/**
		 * Disables keyboard focus for the button.
		 * @param disableKeyboardFocus If `true`, the button cannot be focused using the keyboard. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		disableKeyboardFocus(disableKeyboardFocus = true) {
			return this.setProperty("disableKeyboardFocus", disableKeyboardFocus);
		}

		/**
		 * Intercepts the `Click` event and re-emits it with a different name.
		 * @param alias The new event name to emit.
		 * @param data The data properties to add to the alias event, if any
		 * @returns The builder instance for chaining.
		 */
		emit(alias: string, data?: Record<string, unknown>) {
			this.initializer.intercept("Click", alias, data);
			return this;
		}
	}
}
