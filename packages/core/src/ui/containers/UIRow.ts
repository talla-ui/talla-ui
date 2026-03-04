import { ViewBuilder } from "../../app/index.js";
import { UIContainer } from "./UIContainer.js";
import { UIScrollView } from "./UIScrollView.js";

/**
 * A view class that represents a row container element
 *
 * @description A row container lays out its contained UI elements horizontally.
 *
 * @online_docs Refer to the online documentation for more information on using this UI element class.
 */
export class UIRow extends UIContainer {}

export namespace UIRow {
	/**
	 * Creates a view builder for a horizontal row container element
	 * @param builders Optional view builders for the content of the row.
	 * @returns A builder object for configuring the row.
	 * @see {@link UIRow}
	 * @see {@link UIContainer}
	 */
	export function rowBuilder(...builders: Array<ViewBuilder | undefined>) {
		return new RowBuilder().with(...builders);
	}

	/**
	 * A builder class for creating `UIRow` instances.
	 * - Objects of this type are returned by the `UI.Row()` function.
	 */
	export class RowBuilder extends UIContainer.ContainerBuilder<UIRow> {
		/** The initializer that is used to create each row instance */
		readonly initializer = new ViewBuilder.Initializer(UIRow);

		/**
		 * Wraps the row in a scroll view container.
		 * @returns A new scroll view builder, for the scrolling container that will contain this row.
		 * @see {@link UIScrollView}
		 */
		scroll() {
			return new UIScrollView.ScrollViewBuilder()
				.setContent(this)
				.layout({ axis: "horizontal", clip: true });
		}
	}
}
