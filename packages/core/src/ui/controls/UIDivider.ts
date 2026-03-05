import { ViewBuilder } from "../../app/index.js";
import { BindingOrValue, isBinding } from "../../object/index.js";
import { UIColor } from "../style/index.js";
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
	 * - Defaults to the named 'divider' color if not set.
	 */
	lineColor?: UIColor = undefined;

	/**
	 * The divider line style.
	 * - Defaults to "solid".
	 */
	lineStyle: UIDivider.LineStyle = "solid";

	/** True if the divider should be drawn as a vertical line instead of horizontal. */
	vertical?: boolean;
}

export namespace UIDivider {
	/** The line style for divider elements. */
	export type LineStyle = "solid" | "dashed" | "dotted";

	/**
	 * Creates a view builder for a divider line element.
	 * @param lineWidth The width of the line, in pixels or a string with unit.
	 * @param lineColor The color of the line, as a color name or a {@link UIColor} instance.
	 * @param lineStyle The style of the line, as a {@link UIDivider.LineStyle} value.
	 * @returns A builder object for configuring the divider.
	 * @see {@link UIDivider}
	 */
	export function dividerBuilder(
		lineWidth?: BindingOrValue<string | number>,
		lineColor?: BindingOrValue<UIColor | UIColor.ColorName | undefined>,
		lineStyle?: BindingOrValue<UIDivider.LineStyle>,
	) {
		let result = new DividerBuilder();
		if (lineWidth != null) result.lineWidth(lineWidth);
		if (typeof lineColor === "string") lineColor = UIColor.getColor(lineColor);
		if (lineColor) result.lineColor(lineColor);
		if (lineStyle != null) result.lineStyle(lineStyle);
		return result;
	}

	/**
	 * A builder class for creating {@link UIDivider} instances.
	 * - Returned by the {@link UI.Divider()} function.
	 */
	export class DividerBuilder extends UIElement.ElementBuilder<UIDivider> {
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
		 * Sets the line style of the divider.
		 * @param style The line style ("solid", "dashed", or "dotted").
		 * @returns The builder instance for chaining.
		 */
		lineStyle(style: BindingOrValue<UIDivider.LineStyle>) {
			return this.setProperty("lineStyle", style);
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
