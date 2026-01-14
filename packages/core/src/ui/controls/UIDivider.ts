import { ViewBuilder } from "../../app/index.js";
import { BindingOrValue, isBinding } from "../../object/index.js";
import { StyleOverrides, UIColor } from "../style/index.js";
import { UIElement } from "../UIElement.js";

/**
 * A view class that represents a horizontal or vertical divider line.
 * - Use the {@link UI.Divider()} function to create dividers using a builder.
 *
 * @online_docs Refer to the online documentation for more information on using this UI element class.
 */
export class UIDivider extends UIElement {
	/**
	 * The divider line width.
	 * - Accepts pixels or a CSS length with unit.
	 * - Defaults to 1.
	 */
	lineWidth: string | number = 1;

	/**
	 * The divider line color.
	 * - Defaults to the preset divider color if not set.
	 */
	lineColor?: UIColor = undefined;

	/**
	 * The amount of space perpendicular to the divider.
	 * - Accepts pixels or a CSS length with unit.
	 * - If not set, the current default gap is used.
	 */
	lineMargin?: StyleOverrides.Offsets = undefined;

	/** True if the divider should be drawn as a vertical line instead of horizontal. */
	vertical?: boolean;
}

export namespace UIDivider {
	/** Default style names for divider elements. */
	export type StyleName = "default" | "dashed" | "dotted";

	/**
	 * Creates a view builder for a divider line element.
	 * @param lineWidth The width of the line, in pixels or a string with unit.
	 * @param lineColor The color of the line, as a color name or a {@link UIColor} instance.
	 * @param lineMargin The margin around the line, in pixels or a string with unit.
	 * @returns A builder object for configuring the divider.
	 * @see {@link UIDivider}
	 */
	export function dividerBuilder(
		lineWidth?: BindingOrValue<string | number>,
		lineColor?: BindingOrValue<UIColor | UIColor.ColorName | undefined>,
		lineMargin?: BindingOrValue<string | number>,
	) {
		let result = new DividerBuilder();
		if (lineWidth != null) result.lineWidth(lineWidth);
		if (typeof lineColor === "string") lineColor = UIColor.getColor(lineColor);
		if (lineColor) result.lineColor(lineColor);
		if (lineMargin != null) result.lineMargin(lineMargin);
		return result;
	}

	/**
	 * A builder class for creating {@link UIDivider} instances.
	 * - Returned by the {@link UI.Divider()} function.
	 */
	export class DividerBuilder extends UIElement.ElementBuilder<
		UIDivider,
		UIDivider.StyleName
	> {
		/** The initializer used to create each divider instance. */
		readonly initializer = new ViewBuilder.Initializer(UIDivider);

		/**
		 * Sets the thickness of the divider line.
		 * @param width The line width in pixels or a string with unit.
		 * @returns The builder instance for chaining.
		 */
		lineWidth(width: BindingOrValue<string | number>) {
			return this.setProperty("lineWidth", width);
		}

		/**
		 * Sets the color of the divider line.
		 * - Alias for {@link lineColor()}.
		 */
		override fg(
			color: BindingOrValue<UIColor | UIColor.ColorName | undefined>,
		) {
			return this.lineColor(color);
		}

		/**
		 * Sets the color of the divider line.
		 * @param color A {@link UIColor} instance or a color name.
		 * @returns The builder instance for chaining.
		 */
		lineColor(
			color: BindingOrValue<
				UIColor | UIColor.ColorName | undefined
			> = "divider",
		) {
			return this.setProperty(
				"lineColor",
				isBinding(color)
					? color.map((c) => (typeof c === "string" ? UIColor.getColor(c) : c))
					: typeof color === "string"
						? UIColor.getColor(color)
						: color,
			);
		}

		/**
		 * Sets the margin on either side of the divider line.
		 * @param margin The margin in pixels or a string with unit.
		 * @returns The builder instance for chaining.
		 */
		lineMargin(margin: BindingOrValue<StyleOverrides.Offsets | undefined>) {
			return this.setProperty("lineMargin", margin);
		}

		/**
		 * Sets the margin around the divider line.
		 * - Alias for {@link lineMargin()}.
		 */
		override margin(
			margin?: BindingOrValue<StyleOverrides.Offsets | undefined>,
		) {
			return this.lineMargin(margin);
		}

		/**
		 * Makes the divider vertical.
		 * @param vertical True to draw the divider vertically; defaults to true.
		 * @returns The builder instance for chaining.
		 */
		vertical(vertical: BindingOrValue<boolean> = true) {
			return this.setProperty("vertical", vertical);
		}
	}
}
