import { ConfigOptions, StringConvertible } from "@talla-ui/util";
import type { UIIconResource, UILabel } from "../ui/index.js";

/**
 * A class that contains options for the display of a modal menu
 * @see {@link UITheme.MenuController}
 */
export class ModalMenuOptions extends ConfigOptions {
	/**
	 * Creates a new object with the specified options
	 * @param items List of items to be included in the menu
	 * @param width Target width of the menu, in pixels or CSS length with unit (optional)
	 */
	constructor(
		items: ModalMenuOptions.MenuItem[] = [],
		width?: string | number,
	) {
		super();
		this.items = items;
		this.width = width;
	}

	/** List of items to be included in the menu */
	items: ModalMenuOptions.MenuItem[];

	/** Target width of the menu, in pixels or CSS length with unit */
	width?: string | number;
}

export namespace ModalMenuOptions {
	/**
	 * An object that represents a menu item, used by {@link UITheme.MenuController}
	 * - Each item represents either a selectable menu item (with key), or a separator.
	 */
	export type MenuItem =
		| {
				key: string;
				text?: StringConvertible;
				icon?: UIIconResource;
				iconSize?: string | number;
				hint?: StringConvertible;
				hintIcon?: UIIconResource;
				hintIconSize?: string | number;
				labelStyle?: UILabel.StyleValue;
				hintStyle?: UILabel.StyleValue;
				disabled?: boolean;
				separate?: never;
		  }
		| {
				key?: never;
				separate: true;
		  };
}
