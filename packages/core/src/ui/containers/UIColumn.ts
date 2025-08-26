import { ViewBuilder } from "../../app/View.js";
import type { BindingOrValue } from "../../object/index.js";
import { UIColor } from "../style/index.js";
import type { UI } from "../UI.js";
import { UIContainer } from "./UIContainer.js";
import { UIScrollView } from "./UIScrollView.js";

/**
 * A view class that represents a column container element
 *
 * @description A column container lays out its contained UI elements vertically.
 *
 * @online_docs Refer to the online documentation for more information on using this UI element class.
 */
export class UIColumn extends UIContainer {
	/** True if content should be displayed in reverse order */
	reverse = false;

	/**
	 * Gap between UI elements, in pixels or CSS length with unit
	 * - This property is set to zero (no gap) by default.
	 * - If this property is set, it overrides {@link UIContainer.Layout layout.separator}. If not set (undefined value), the current default gap is used.
	 */
	gap?: string | number = 0;

	/**
	 * Alignment of content along the horizontal axis, defaults to `stretch` if not set
	 * - If this property is set, its value overrides {@link UIContainer.Layout layout.gravity}.
	 */
	align?: UIContainer.Layout["gravity"] = undefined;

	/**
	 * Distribution of content along the vertical axis
	 * - If this property is set, its value overrides {@link UIContainer.Layout layout.distribution}.
	 */
	distribute?: UIContainer.Layout["distribution"] = undefined;
}

export namespace UIColumn {
	/**
	 * Creates a view builder for a vertical column container element
	 * @param builders Optional view builders for the content of the column.
	 * @returns A builder object for configuring the column.
	 * @see {@link UIColumn}
	 * @see {@link UIContainer}
	 */
	export function columnBuilder(...builders: ViewBuilder[]) {
		return new ColumnBuilder().with(...builders);
	}

	/**
	 * A builder class for creating `UIColumn` instances.
	 * - Objects of this type are returned by the `UI.Column()` function.
	 */
	export class ColumnBuilder extends UIContainer.ContainerBuilder<UIColumn> {
		/** The initializer that is used to create each column instance */
		readonly initializer = new ViewBuilder.Initializer(UIColumn);

		/**
		 * Sets the gap between elements in the column, using {@link UIColumn.gap}.
		 * @param gap The gap size in pixels, or a string with unit.
		 * @returns The builder instance for chaining.
		 */
		gap(gap?: BindingOrValue<string | number>) {
			return this.setProperty("gap", gap);
		}

		/**
		 * Adds a divider line between elements in the column.
		 * - This method updates the {@link UIContainer.layout layout} property.
		 * @param lineWidth The width of the divider line, in pixels or a string with unit.
		 * @param lineColor The color of the divider line.
		 * @param lineMargin The margin around the divider line, in pixels or a string with unit.
		 * @returns The builder instance for chaining.
		 */
		divider(
			lineWidth: string | number = 1,
			lineColor?: UIColor | UI.ColorName,
			lineMargin?: string | number,
		) {
			this.initializer.finalize((view) => {
				if (typeof lineColor === "string")
					lineColor = UIColor.theme.ref(lineColor);
				view.layout = {
					...view.layout,
					separator: {
						lineWidth,
						lineColor,
						lineMargin,
					},
				};
			});
			return this;
		}

		/**
		 * Sets the alignment of content within the column, using {@link UIColumn.align}.
		 * @param horizontal The horizontal alignment (`start`, `center`, `end`, `stretch`).
		 * @param distribute The vertical distribution (`start`, `center`, `end`, `space-between`).
		 * @returns The builder instance for chaining.
		 */
		align(
			horizontal?: BindingOrValue<UIContainer.Layout["gravity"]>,
			distribute?: BindingOrValue<UIContainer.Layout["distribution"]>,
		) {
			if (horizontal) this.initializer.set("align", horizontal);
			if (distribute) this.initializer.set("distribute", distribute);
			return this;
		}

		/**
		 * Reverses the order of elements in the column, using {@link UIColumn.reverse}.
		 * @param reverse If `true`, the order is reversed. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		reverse(reverse: BindingOrValue<boolean> = true) {
			return this.setProperty("reverse", reverse);
		}

		/**
		 * Wraps the column in a scroll view container.
		 * @returns A new scroll view builder, for the scrolling container that will contain this column.
		 * @see {@link UIScrollView}
		 */
		scroll() {
			return new UIScrollView.ScrollViewBuilder().setContent(this);
		}
	}
}
