import { ViewBuilder } from "../../app/index.js";
import { UIColor } from "../style/index.js";
import { UIContainer } from "./UIContainer.js";
import { UIScrollView } from "./UIScrollView.js";

/**
 * A view class that represents a column container element
 *
 * @description A column container lays out its contained UI elements vertically.
 *
 * @online_docs Refer to the online documentation for more information on using this UI element class.
 */
export class UIColumn extends UIContainer {}

export namespace UIColumn {
	/**
	 * Creates a view builder for a vertical column container element
	 * @param builders Optional view builders for the content of the column.
	 * @returns A builder object for configuring the column.
	 * @see {@link UIColumn}
	 * @see {@link UIContainer}
	 */
	export function columnBuilder(...builders: Array<ViewBuilder | undefined>) {
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
		 * Adds a divider line between elements in the column.
		 * - This method updates the {@link UIContainer.layout layout} property.
		 * @param lineWidth The width of the divider line, in pixels or a string with unit; defaults to 1.
		 * @param lineColor The color of the divider line.
		 * @param lineMargin The margin around the divider line, in pixels or a string with unit.
		 * @returns The builder instance for chaining.
		 */
		divider(
			lineWidth: string | number = 1,
			lineColor?: UIColor | UIColor.ColorName,
			lineMargin?: string | number,
		) {
			this.initializer.finalize((view) => {
				if (typeof lineColor === "string")
					lineColor = UIColor.getColor(lineColor);
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
		 * Wraps the column in a scroll view container.
		 * @returns A new scroll view builder, for the scrolling container that will contain this column.
		 * @see {@link UIScrollView}
		 */
		scroll() {
			return new UIScrollView.ScrollViewBuilder().setContent(this);
		}
	}
}
