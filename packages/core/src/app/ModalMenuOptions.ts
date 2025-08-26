import { ConfigOptions, StringConvertible } from "@talla-ui/util";
import type { AppContext } from "./AppContext.js";
import type { UIIconResource, UIStyle } from "../ui/index.js";

/**
 * A class that contains options for the display of a modal menu
 * @see {@link AppContext.MenuController}
 */
export class ModalMenuOptions extends ConfigOptions {
	/**
	 * Creates a new object with the specified options
	 * @param items List of items to be included in the menu
	 * @param width Target width of the menu, in pixels or CSS length with unit (optional)
	 * @param minWidth Minimum width of the menu, in pixels or CSS length with unit (optional)
	 */
	constructor(
		items: ModalMenuOptions.MenuItem[] = [],
		width?: string | number,
		minWidth?: string | number,
	) {
		super();
		this.items = items;
		this.width = width;
		this.minWidth = minWidth;
	}

	/** List of items to be included in the menu */
	items: ModalMenuOptions.MenuItem[];

	/** Target width of the menu, in pixels or CSS length with unit */
	width?: string | number;

	/** Minimum width of the menu, in pixels or CSS length with unit */
	minWidth?: string | number;
}

export namespace ModalMenuOptions {
	/**
	 * An object that represents a menu item, used by {@link AppContext.MenuController}
	 * - Each item represents either a selectable menu item (with key), or a divider.
	 */
	export type MenuItem =
		| {
				key: string;
				text?: StringConvertible;
				icon?: UIIconResource;
				iconSize?: number;
				hint?: StringConvertible;
				hintIcon?: UIIconResource;
				hintIconSize?: number;
				labelStyle?: UIStyle.StyleOptions;
				hintStyle?: UIStyle.StyleOptions;
				disabled?: boolean;
				divider?: never;
		  }
		| {
				key?: never;
				divider: true;
		  };
}
