import { fmt, StringConvertible } from "@talla-ui/util";
import { ViewBuilder } from "../../app/index.js";
import { Binding, BindingOrValue, isBinding } from "../../object/index.js";
import { StyleOverrides, UIColor, UIIconResource } from "../style/index.js";
import { UIElement } from "../UIElement.js";

/**
 * A view class that represents a text element.
 * - Use the {@link UI.Text()} function to create text elements using a builder.
 *
 * @online_docs Refer to the online documentation for more information on using this UI element class.
 */
export class UIText extends UIElement {
	/** Creates a new text view object with the specified text. */
	constructor(text?: StringConvertible) {
		super();
		this.text = text;
	}

	/** The text content to be displayed. */
	text?: StringConvertible;

	/** The icon to be displayed alongside the text. */
	icon?: UIIconResource = undefined;

	/** The style options for displaying the icon. */
	iconStyle?: UIText.IconStyle = undefined;

	/**
	 * The heading level for semantic HTML output.
	 * - Valid values are 1-6, where 1 is the most prominent heading (e.g. `<h1>`).
	 * - This property cannot be changed after rendering.
	 */
	headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;

	/** True if the text should be rendered as HTML instead of plain text. */
	htmlFormat?: boolean;

	/**
	 * True if text selection should be enabled within this element.
	 * - Defaults to false.
	 * - This property is not observed and cannot be changed after rendering.
	 * - If set, this value overrides the `userTextSelect` style property.
	 */
	selectable?: boolean;

	/**
	 * True if this element may receive input focus.
	 * - This property is not observed and cannot be changed after rendering.
	 */
	allowFocus?: boolean;

	/**
	 * True if this element may receive input focus using the keyboard (e.g. Tab key).
	 * - This property is not observed and cannot be changed after rendering.
	 * - If set to true, {@link allowFocus} is assumed to be true as well.
	 */
	allowKeyboardFocus?: boolean;
}

export namespace UIText {
	/**
	 * Options for displaying an icon within a text or button control.
	 */
	export type IconStyle = {
		/** The icon size in pixels or as a string with unit. */
		size?: string | number;

		/** The space between the icon and text, in pixels or as a string with unit. */
		margin?: string | number;

		/** The icon color. */
		color?: UIColor;
	};

	/** Default style names for text/label elements. */
	export type StyleName =
		| "default"
		| "body"
		| "large"
		| "title"
		| "headline"
		| "caption"
		| "badge"
		| "dangerBadge"
		| "successBadge"
		| "toggleText";

	/**
	 * Creates a view builder for a text element.
	 * @param text The text content to display, or a binding to a string value.
	 * @returns A builder object for configuring the text element.
	 * @see {@link UIText}
	 */
	export function textBuilder(text?: BindingOrValue<StringConvertible>) {
		return new TextBuilder().text(text);
	}

	export namespace textBuilder {
		/**
		 * Creates a view builder for a text element with localizable or dynamic text.
		 * @param text The text to display, passed to {@link fmt()} or {@link Binding.fmt()}.
		 * @param args Additional bindings used to format the text dynamically.
		 * @returns A builder instance for chaining.
		 */
		export function fmt(text: StringConvertible, ...args: Binding[]) {
			return new TextBuilder().fmt(text, ...args);
		}
	}

	/**
	 * A builder class for creating {@link UIText} instances.
	 * - Returned by the {@link UI.Text()} function.
	 */
	export class TextBuilder extends UIElement.ElementBuilder<
		UIText,
		UIText.StyleName
	> {
		/** The initializer used to create each text element instance. */
		readonly initializer = new ViewBuilder.Initializer(UIText);

		/**
		 * Sets the text content.
		 * @param text The text to display, or a binding to a string value.
		 * @returns The builder instance for chaining.
		 */
		text(text?: BindingOrValue<StringConvertible>) {
			return this.setProperty("text", text);
		}

		/**
		 * Sets localizable or dynamic text.
		 * @param text The text to display, passed to {@link fmt()} or {@link Binding.fmt()}.
		 * @param args Additional bindings used to format the text dynamically.
		 * @returns The builder instance for chaining.
		 */
		fmt(text: StringConvertible, ...args: Binding[]) {
			if (args.length === 0) return this.text(fmt(text));
			return this.text(Binding.fmt(text, ...args));
		}

		/**
		 * Sets the icon to display alongside the text.
		 * @param icon An icon resource, an icon name, or a binding.
		 * @param iconStyle Styling options for the icon, or only the icon size in pixels.
		 * @returns The builder instance for chaining.
		 */
		icon(
			icon: BindingOrValue<
				UIIconResource | UIIconResource.IconName | undefined
			>,
			iconStyle?: BindingOrValue<UIText.IconStyle> | number,
		) {
			if (iconStyle != null) {
				this.initializer.update(iconStyle, function (value) {
					this.iconStyle = typeof value === "number" ? { size: value } : value;
				});
			}
			if (typeof icon === "string") {
				icon = UIIconResource.getIcon(icon);
			} else if (isBinding(icon)) {
				icon = icon.map((value) =>
					typeof value === "string" ? UIIconResource.getIcon(value) : value,
				);
			}
			return this.setProperty("icon", icon);
		}

		/**
		 * Sets the text alignment to center.
		 * - Shorthand for `textAlign("center")`.
		 */
		center() {
			return this.textAlign("center");
		}

		/**
		 * Enables or disables text wrapping.
		 * @param mode The line break mode, or true to use `pre-wrap`; defaults to true.
		 * @returns The builder instance for chaining.
		 */
		wrap(
			mode: BindingOrValue<boolean | StyleOverrides["lineBreakMode"]> = true,
		) {
			function t(value: boolean | StyleOverrides["lineBreakMode"]) {
				return value === true ? "pre-wrap" : value || "";
			}
			return this.setStyleOverride(
				"lineBreakMode",
				isBinding(mode) ? mode.map(t) : t(mode as any),
			);
		}

		/**
		 * Sets the heading level for semantic HTML output.
		 * @param level The heading level (1-6).
		 * @returns The builder instance for chaining.
		 */
		headingLevel(level?: BindingOrValue<1 | 2 | 3 | 4 | 5 | 6>) {
			return this.setProperty("headingLevel", level);
		}

		/**
		 * Sets the text content to be interpreted as HTML.
		 * - Sets {@link UIText.htmlFormat} to true.
		 * @param text The HTML content to display, or a binding to a string value.
		 * @returns The builder instance for chaining.
		 */
		html(text?: BindingOrValue<StringConvertible>) {
			this.initializer.set("htmlFormat", true);
			return this.setProperty("text", text);
		}

		/**
		 * Makes the text selectable by the user.
		 * @param selectable True to enable text selection; defaults to true.
		 * @returns The builder instance for chaining.
		 */
		selectable(selectable: BindingOrValue<boolean> = true) {
			return this.setProperty("selectable", selectable);
		}

		/**
		 * Allows the text element to receive input focus.
		 * @param allow True to allow focus; defaults to true.
		 * @returns The builder instance for chaining.
		 */
		allowFocus(allow = true) {
			return this.setProperty("allowFocus", allow);
		}

		/**
		 * Allows the text element to receive input focus via the keyboard.
		 * @param allow True to allow keyboard focus; defaults to true.
		 * @returns The builder instance for chaining.
		 */
		allowKeyboardFocus(allow = true) {
			if (allow) this.allowFocus(true);
			return this.setProperty("allowKeyboardFocus", allow);
		}
	}
}
