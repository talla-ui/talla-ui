import { ViewBuilder } from "../../app/index.js";
import { ObservableEvent } from "../../object/index.js";
import { UIContainer } from "./UIContainer.js";
import { UIScrollView } from "./UIScrollView.js";

/**
 * A view class that represents an interactive container element
 *
 * @description A cell container functions like a basic container element (using column layout), taking up as much space as possible by default, and with additional properties for decoration and styling.
 *
 * @online_docs Refer to the online documentation for more information on using this UI element class.
 */
export class UICell extends UIContainer {
	/**
	 * True if this cell *itself* may receive direct input focus
	 * - This property can't be changed after rendering.
	 */
	allowFocus?: boolean;

	/**
	 * True if this cell *itself* may receive input focus using the keyboard (e.g. Tab key)
	 * - This property can't be changed after rendering.
	 * - If this property is set to true, allowFocus is assumed to be true as well and no longer checked.
	 */
	allowKeyboardFocus?: boolean;
}

export namespace UICell {
	/**
	 * Creates a view builder for an interactive cell container element
	 * @param builders Optional view builders for the content of the cell.
	 * @returns A builder object for configuring the cell.
	 * @see {@link UICell}
	 * @see {@link UIContainer}
	 */
	export function cellBuilder(...builders: ViewBuilder[]) {
		return new CellBuilder().with(...builders);
	}

	/**
	 * A builder class for creating `UICell` instances.
	 * - Objects of this type are returned by the `UI.Cell()` function.
	 */
	export class CellBuilder extends UIContainer.ContainerBuilder<UICell> {
		/** The initializer that is used to create each cell instance */
		readonly initializer = new ViewBuilder.Initializer(UICell);

		/**
		 * Allows the cell to receive input focus.
		 * @param allow If `true`, the cell can be focused. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		allowFocus(allow = true) {
			return this.setProperty("allowFocus", allow);
		}

		/**
		 * Allows the cell to receive input focus via the keyboard.
		 * @param allow If `true`, the cell can be focused with the keyboard. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		allowKeyboardFocus(allow = true) {
			if (allow) this.allowFocus(true);
			return this.setProperty("allowKeyboardFocus", allow);
		}

		/**
		 * Handles the `MouseEnter` event
		 * @param handle The function to call, or name of the event to emit instead
		 * @see {@link UIElement.ElementBuilder.handle()}
		 */
		onMouseEnter(
			handle: string | ((event: ObservableEvent, cell: UICell) => void),
		) {
			return this.handle("MouseEnter", handle);
		}

		/**
		 * Handles the `MouseLeave` event
		 * @param handle The function to call, or name of the event to emit instead
		 * @see {@link UIElement.ElementBuilder.handle()}
		 */
		onMouseLeave(
			handle: string | ((event: ObservableEvent, cell: UICell) => void),
		) {
			return this.handle("MouseLeave", handle);
		}

		/**
		 * Wraps the cell in a scroll view container.
		 * @returns A new scroll view builder, for the scrolling container that will contain this cell.
		 */
		scroll() {
			return new UIScrollView.ScrollViewBuilder().setContent(this);
		}
	}
}
