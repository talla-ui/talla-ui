import { ViewBuilder } from "../../app/index.js";
import { BindingOrValue } from "../../object/index.js";
import { UIViewElement } from "../UIViewElement.js";

/**
 * A view class that represents an empty control without any content
 *
 * @description A spacer UI element is rendered as an empty placeholder.
 *
 * @online_docs Refer to the online documentation for more information on using this UI element class.
 */
export class UISpacer extends UIViewElement {
	// ...nothing here but space...
}

export namespace UISpacer {
	/**
	 * Creates a view builder for a spacer element
	 * @note The view builder automatically sets the `grow` property to `true` if no dimensions are specified, so the spacer will grow to fill the available space.
	 * @param minWidth The minimum width of the spacer, in pixels or a string with unit.
	 * @param minHeight The minimum height of the spacer, in pixels or a string with unit; defaults to `minWidth` if not specified.
	 * @returns A builder object for configuring the spacer.
	 * @see {@link UISpacer}
	 */
	export function spacerBuilder(
		minWidth?: BindingOrValue<string | number>,
		minHeight: BindingOrValue<string | number> | undefined = minWidth,
	) {
		let result = new SpacerBuilder();
		if (minWidth) result.minWidth(minWidth);
		if (minHeight) result.minHeight(minHeight);
		if (!minWidth && !minHeight) result.grow();
		return result;
	}

	/**
	 * A builder class for creating `UISpacer` instances.
	 * - Objects of this type are returned by the `UI.Spacer()` function.
	 */
	export class SpacerBuilder extends UIViewElement.ElementBuilder<UISpacer> {
		/** The initializer that is used to create each spacer instance */
		readonly initializer = new ViewBuilder.Initializer(UISpacer);
	}
}
