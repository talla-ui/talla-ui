import { ViewBuilder } from "../../app/index.js";
import { BindingOrValue, isBinding } from "../../object/index.js";
import { UIColor, UIStyle } from "../style/index.js";
import type { UI } from "../UI.js";
import { UIElement } from "../UIElement.js";

/**
 * A view class that represents a horizontal or vertical divider line
 *
 * @description A divider UI element is rendered as a single horizontal or vertical line.
 *
 * @online_docs Refer to the online documentation for more information on using this UI element class.
 */
export class UIDivider extends UIElement {
	/** Divider line width, in pixels or CSS length with unit */
	lineWidth: string | number = 1;

	/** Divider line color, defaults to the preset divider color if not set */
	lineColor?: UIColor = undefined;

	/**
	 * The amount of space to be added perpendicular to the divider, in pixels or CSS length with unit
	 * - If this property is not set, the current default gap is used.
	 */
	lineMargin?: UIStyle.Offsets = undefined;

	/** True if the divider should be drawn as a vertical line instead of a horizontal line */
	vertical?: boolean;
}

export namespace UIDivider {
	/**
	 * Creates a view builder for a divider line element
	 * @param lineWidth The width of the line, in pixels or a string with unit.
	 * @param lineColor The color of the line, as a theme color name or a {@link UIColor} instance.
	 * @param lineMargin The margin around the line, in pixels or a string with unit.
	 * @returns A builder object for configuring the divider.
	 * @see {@link UIDivider}
	 */
	export function dividerBuilder(
		lineWidth?: BindingOrValue<string | number>,
		lineColor?: BindingOrValue<UIColor | UI.ColorName | undefined>,
		lineMargin?: BindingOrValue<string | number>,
	) {
		let result = new DividerBuilder();
		if (lineWidth != null) result.lineWidth(lineWidth);
		if (typeof lineColor === "string") lineColor = UIColor.theme.ref(lineColor);
		if (lineColor) result.lineColor(lineColor);
		if (lineMargin != null) result.lineMargin(lineMargin);
		return result;
	}

	/**
	 * A builder class for creating `UIDivider` instances.
	 * - Objects of this type are returned by the `UI.Divider()` function.
	 */
	export class DividerBuilder extends UIElement.ElementBuilder<UIDivider> {
		/** The initializer that is used to create each divider instance */
		readonly initializer = new ViewBuilder.Initializer(UIDivider);

		/**
		 * Sets the thickness of the divider line, using {@link UIDivider.lineWidth}.
		 * @param width The line width in pixels or a string with unit.
		 * @returns The builder instance for chaining.
		 */
		lineWidth(width: BindingOrValue<string | number>) {
			return this.setProperty("lineWidth", width);
		}

		/**
		 * Alias for `lineColor`, to set the color of the divider line.
		 */
		override fg(color: BindingOrValue<UIColor | UI.ColorName | undefined>) {
			return this.lineColor(color);
		}

		/**
		 * Sets the color of the divider line, using {@link UIDivider.lineColor}.
		 * @param color A {@link UIColor} instance or a theme color name.
		 * @returns The builder instance for chaining.
		 */
		lineColor(color: BindingOrValue<UIColor | UI.ColorName | undefined>) {
			return this.setProperty(
				"lineColor",
				isBinding(color)
					? color.map((c) =>
							typeof c === "string" ? UIColor.theme.ref(c as any) : c,
						)
					: typeof color === "string"
						? UIColor.theme.ref(color)
						: color,
			);
		}

		/**
		 * Sets the margin (space) on either side of the divider line.
		 * @param margin The margin in pixels or a string with unit.
		 * @returns The builder instance for chaining.
		 */
		lineMargin(margin: BindingOrValue<UIStyle.Offsets | undefined>) {
			return this.setProperty("lineMargin", margin);
		}

		/**
		 * Alias for `lineMargin`, to set the margin around the divider line.
		 */
		override margin(margin?: BindingOrValue<UIStyle.Offsets | undefined>) {
			return this.lineMargin(margin);
		}

		/**
		 * Makes the divider vertical.
		 * @param vertical If `true`, the divider is drawn vertically, using {@link UIDivider.vertical}.
		 * @returns The builder instance for chaining.
		 */
		vertical(vertical: BindingOrValue<boolean> = true) {
			return this.setProperty("vertical", vertical);
		}

		/**
		 * Applies a style to the divider line.
		 * @param style The name of a theme divider style, a {@link UIStyle} instance, a style options (overrides) object, or a binding.
		 * @returns The builder instance for chaining.
		 */
		dividerStyle(
			style?: BindingOrValue<
				UI.styles.DividerStyleName | UIStyle | UIStyle.StyleOptions | undefined
			>,
		) {
			return this.setStyleProperty(style, UIStyle.theme.divider);
		}
	}
}
