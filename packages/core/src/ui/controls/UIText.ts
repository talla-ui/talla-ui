import { fmt, StringConvertible } from "@talla-ui/util";
import { ViewBuilder } from "../../app/index.js";
import { Binding, BindingOrValue, isBinding } from "../../object/index.js";
import { UIColor, UIIconResource, UIStyle } from "../style/index.js";
import type { UI } from "../UI.js";
import { UIElement } from "../UIElement.js";

/**
 * A view class that represents a text element
 *
 * @description A text element is rendered as a stand-alone piece of text.
 *
 * @online_docs Refer to the online documentation for more information on using this UI element class.
 */
export class UIText extends UIElement {
	/** Creates a new text view object with the specified text */
	constructor(text?: StringConvertible) {
		super();
		this.text = text;
	}

	/** The text to be displayed */
	text?: StringConvertible;

	/** The icon to be displayed */
	icon?: UIIconResource = undefined;

	/** Options for displaying the icon */
	iconStyle?: UIText.IconStyle = undefined;

	/**
	 * Text heading level
	 * - Heading level 1 refers to the most prominent heading, i.e. `<h1>` HTML element.
	 * - This property can't be changed after rendering.
	 */
	headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;

	/** True if text should be rendered as HTML instead of plain text */
	htmlFormat?: boolean;

	/**
	 * True if text selection should be enabled within this text element, defaults to false
	 * - This property isn't observed, and can't be changed after rendering. If set, this value overrides the `userTextSelect` style property.
	 */
	selectable?: boolean;

	/**
	 * True if this element may receive input focus
	 * - This property isn't observed, and can't be changed after rendering.
	 */
	allowFocus?: boolean;

	/**
	 * True if this element may receive input focus using the keyboard (e.g. Tab key)
	 * - This property isn't observed, and can't be changed after rendering.
	 * - If this property is set to true, allowFocus is assumed to be true as well and no longer checked.
	 */
	allowKeyboardFocus?: boolean;
}

export namespace UIText {
	/** Options for displaying an icon within a text or button control */
	export type IconStyle = {
		/** Icon size (in pixels or string with unit) */
		size?: string | number;

		/** Space between icon and text (in pixels or string with unit) */
		margin?: string | number;

		/** Icon color */
		color?: UIColor;
	};
}

export namespace UIText {
	/**
	 * Creates a view builder for a text element
	 * @param text The text content to display, or a binding to a string value.
	 * @returns A builder object for configuring the text element.
	 * @see {@link UIText}
	 */
	export function textBuilder(text?: BindingOrValue<StringConvertible>) {
		return new TextBuilder().text(text);
	}

	export namespace textBuilder {
		/**
		 * Creates a view builder for a text element with a localizable or dynamic text.
		 * @param text The text to display, passed to {@link fmt()} or {@link Binding.fmt()}
		 * @param args Additional bindings, used to format the text dynamically
		 * @returns A builder instance for chaining.
		 */
		export function fmt(text: StringConvertible, ...args: Binding[]) {
			return new TextBuilder().fmt(text, ...args);
		}
	}

	/**
	 * A builder class for creating `UIText` instances.
	 * - Objects of this type are returned by the `UI.Text()` function.
	 */
	export class TextBuilder extends UIElement.ElementBuilder<UIText> {
		/** The initializer that is used to create each text element instance */
		readonly initializer = new ViewBuilder.Initializer(UIText);

		/**
		 * Sets the text for the element, using {@link UIText.text}.
		 * @param text The text to display, or a binding to a string value.
		 * @returns The builder instance for chaining.
		 */
		text(text?: BindingOrValue<StringConvertible>) {
			return this.setProperty("text", text);
		}

		/**
		 * Sets a localizable or dynamic text.
		 * @param text The text to display, passed to {@link fmt()} or {@link Binding.fmt()}
		 * @param args Additional bindings, used to format the text dynamically
		 * @returns The builder instance for chaining.
		 */
		fmt(text: StringConvertible, ...args: Binding[]) {
			if (args.length === 0) return this.text(fmt(text));
			return this.text(Binding.fmt(text, ...args));
		}

		/**
		 * Sets the icon, using {@link UIText.icon}.
		 * @param icon An icon resource, a theme icon name, or a binding to an icon.
		 * @param iconStyle Styling options for the icon, or only the icon size (in pixels).
		 * @returns The builder instance for chaining.
		 */
		icon(
			icon: UI.IconName | BindingOrValue<UIIconResource | string | undefined>,
			iconStyle?: BindingOrValue<UIText.IconStyle> | number,
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
		 * A shorthand for `textAlign("center")`, to set the text alignment to center.
		 */
		center() {
			return this.textAlign("center");
		}

		/**
		 * Enables or disables text wrapping by setting the line break mode
		 * @param lineBreakMode Line break mode (string) or boolean. If `true`, sets the line break mode to `pre-wrap`. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		wrap(
			mode: BindingOrValue<
				boolean | UIStyle.StyleOptions["lineBreakMode"]
			> = true,
		) {
			function t(value: boolean | UIStyle.StyleOptions["lineBreakMode"]) {
				return value === true ? "pre-wrap" : value || "";
			}
			return this.setStyleOverride(
				"lineBreakMode",
				isBinding(mode) ? mode.map(t) : t(mode as any),
			);
		}

		/**
		 * Sets the heading level for semantic HTML output
		 * @param level The heading level (1-6).
		 * @returns The builder instance for chaining.
		 */
		headingLevel(level?: BindingOrValue<1 | 2 | 3 | 4 | 5 | 6>) {
			return this.setProperty("headingLevel", level);
		}

		/**
		 * Sets the text, to be interpreted as HTML
		 * - This method sets the `htmlFormat` property to `true`, and then sets the text using {@link UIText.text}.
		 * @param text The HTML content to display, or a binding to a string value.
		 * @returns The builder instance for chaining.
		 */
		html(text?: BindingOrValue<StringConvertible>) {
			this.initializer.set("htmlFormat", true);
			return this.setProperty("text", text);
		}

		/**
		 * Makes the text selectable by the user, using {@link UIText.selectable}.
		 * @param selectable If `true`, text can be selected. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		selectable(selectable: BindingOrValue<boolean> = true) {
			return this.setProperty("selectable", selectable);
		}

		/**
		 * Applies a style to the text element
		 * @param style The name of a theme text element style, a {@link UIStyle} instance, a style options (overrides) object, or a binding.
		 * @returns The builder instance for chaining.
		 */
		textStyle(
			style?: BindingOrValue<
				UI.styles.TextStyleName | UIStyle | UIStyle.StyleOptions | undefined
			>,
		) {
			return this.setStyleProperty(style, UIStyle.theme.text);
		}

		/**
		 * Allows the text element to receive input focus.
		 * @param allow If `true`, the text can be focused. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		allowFocus(allow = true) {
			return this.setProperty("allowFocus", allow);
		}

		/**
		 * Allows the text element to receive input focus via the keyboard.
		 * @param allow If `true`, the text can be focused with the keyboard. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		allowKeyboardFocus(allow = true) {
			if (allow) this.allowFocus(true);
			return this.setProperty("allowKeyboardFocus", allow);
		}
	}
}
