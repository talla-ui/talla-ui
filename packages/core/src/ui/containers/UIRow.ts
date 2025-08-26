import { ViewBuilder } from "../../app/index.js";
import type { BindingOrValue } from "../../object/index.js";
import { UIContainer } from "./UIContainer.js";
import { UIScrollView } from "./UIScrollView.js";

/**
 * A view class that represents a row container element
 *
 * @description A row container lays out its contained UI elements horizontally.
 *
 * @online_docs Refer to the online documentation for more information on using this UI element class.
 */
export class UIRow extends UIContainer {
	/** True if content should be displayed in reverse order */
	reverse = false;

	/**
	 * Gap between UI elements, in pixels or CSS length with unit
	 * - If this property is set, it overrides {@link UIContainer.Layout layout.separator}. Otherwise, the current default gap is used.
	 */
	gap?: string | number = undefined;

	/**
	 * Alignment of content along the horizontal axis, defaults to `start` if not set
	 * - If this property is set, its value overrides {@link UIContainer.Layout layout.distribution}.
	 */
	align?: UIContainer.Layout["distribution"] = undefined;

	/**
	 * Alignment of content along the vertical axis
	 * - If this property is set, its value overrides {@link UIContainer.Layout layout.gravity}.
	 */
	gravity?: UIContainer.Layout["gravity"] = undefined;
}

export namespace UIRow {
	/**
	 * Creates a view builder for a horizontal row container element
	 * @param builders Optional view builders for the content of the row.
	 * @returns A builder object for configuring the row.
	 * @see {@link UIRow}
	 * @see {@link UIContainer}
	 */
	export function rowBuilder(...builders: ViewBuilder[]) {
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
		 * Sets the gap between elements in the row.
		 * @param gap The gap size in pixels, or a string with unit.
		 * @returns The builder instance for chaining.
		 */
		gap(gap?: BindingOrValue<string | number>) {
			return this.setProperty("gap", gap);
		}

		/**
		 * Sets the alignment of content within the row, using {@link UIRow.align}.
		 * @param horizontal The horizontal alignment (`start`, `center`, `end`, `fill`).
		 * @param gravity The vertical alignment (`start`, `center`, `end`, `stretch`).
		 * @returns The builder instance for chaining.
		 */
		align(
			horizontal?: BindingOrValue<UIContainer.Layout["distribution"]>,
			gravity?: BindingOrValue<UIContainer.Layout["gravity"]>,
		) {
			if (horizontal) this.initializer.set("align", horizontal);
			if (gravity) this.initializer.set("gravity", gravity);
			return this;
		}

		/**
		 * Reverses the order of elements in the row, using {@link UIRow.reverse}.
		 * @param reverse If `true`, the order is reversed. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		reverse(reverse: BindingOrValue<boolean> = true) {
			return this.setProperty("reverse", reverse);
		}

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
