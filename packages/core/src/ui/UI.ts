import { Binding } from "../object/index.js";
import { UIListView } from "./components/UIListView.js";
import { UIShowView } from "./components/UIShowView.js";
import { UIColumn } from "./containers/UIColumn.js";
import { UIRow } from "./containers/UIRow.js";
import { UIButton } from "./controls/UIButton.js";
import { UIDivider } from "./controls/UIDivider.js";
import { UIImage } from "./controls/UIImage.js";
import { UISpacer } from "./controls/UISpacer.js";
import { UIText } from "./controls/UIText.js";
import { UITextField } from "./controls/UITextField.js";
import { UIToggle } from "./controls/UIToggle.js";
import { UIColor } from "./style/UIColor.js";
import { UIIconResource } from "./style/UIIconResource.js";

/**
 * A namespace that contains functions for building a declarative UI using view builders.
 * - Use these functions to create UI elements such as buttons, text, and containers.
 * - Each function returns a view builder that can be configured using method chaining.
 */
export namespace UI {
	/** Alias for {@link UIColumn.columnBuilder}. */
	export const Column = UIColumn.columnBuilder;

	/** Alias for {@link UIRow.rowBuilder}. */
	export const Row = UIRow.rowBuilder;

	/** Alias for {@link UIButton.buttonBuilder}. */
	export const Button = UIButton.buttonBuilder;

	/** Alias for {@link UIDivider.dividerBuilder}. */
	export const Divider = UIDivider.dividerBuilder;

	/** Alias for {@link UIImage.imageBuilder}. */
	export const Image = UIImage.imageBuilder;

	/** Alias for {@link UIText.textBuilder}. */
	export const Text = UIText.textBuilder;

	/** Alias for {@link UISpacer.spacerBuilder}. */
	export const Spacer = UISpacer.spacerBuilder;

	/** Alias for {@link UITextField.textFieldBuilder}. */
	export const TextField = UITextField.textFieldBuilder;

	/** Alias for {@link UIToggle.toggleBuilder}. */
	export const Toggle = UIToggle.toggleBuilder;

	/** Alias for {@link UIListView.listBuilder}. */
	export const List = UIListView.listBuilder;

	/** Alias for {@link UIShowView.showBuilder}. */
	export const Show = UIShowView.showBuilder;

	/** Alias for {@link UIShowView.showWhenBuilder}. */
	export const ShowWhen = UIShowView.showWhenBuilder;

	/** Alias for {@link UIShowView.showUnlessBuilder}. */
	export const ShowUnless = UIShowView.showUnlessBuilder;

	/**
	 * An object containing all available color references.
	 * @see {@link UIColor.defaults}
	 * @see {@link UIColor.getColor}
	 */
	export const colors: typeof UIColor.defaults = UIColor.defaults;

	/**
	 * Returns a color reference by name, including custom colors.
	 * @param name The name of the color to get.
	 * @returns A {@link UIColor} instance that resolves to the named color.
	 * @see {@link UIColor.getColor}
	 */
	export function color(name: string): UIColor {
		return UIColor.getColor(name);
	}

	/**
	 * An object containing all available icon references.
	 * @see {@link UIIconResource.defaults}
	 * @see {@link UIIconResource.getIcon}
	 */
	export const icons: typeof UIIconResource.defaults = UIIconResource.defaults;

	/**
	 * Returns an icon reference by name, including custom icons.
	 * @param name The name of the icon to get.
	 * @returns A {@link UIIconResource} instance that resolves to the named icon.
	 * @see {@link UIIconResource.getIcon}
	 */
	export function icon(name: string): UIIconResource {
		return UIIconResource.getIcon(name);
	}

	/**
	 * A namespace containing bindings to viewport properties.
	 * - These bindings automatically update when viewport dimensions or preferences change.
	 */
	export namespace viewport {
		/** A binding to the viewport width in logical pixel units. */
		export const width = new Binding<number>("appContext.viewport.width");

		/** A binding to the viewport height in logical pixel units. */
		export const height = new Binding<number>("appContext.viewport.height");

		/** A binding that is true if the viewport is taller than it is wide. */
		export const portrait = new Binding<boolean>(
			"appContext.viewport.portrait",
		);

		/** A binding to the number of columns in the viewport grid. */
		export const cols = new Binding<number>("appContext.viewport.cols");

		/** A binding to the number of rows in the viewport grid. */
		export const rows = new Binding<number>("appContext.viewport.rows");

		/** A binding that is true if the user's preferences indicate a dark color scheme. */
		export const prefersDark = new Binding<boolean>(
			"appContext.viewport.prefersDark",
		);
	}
}
