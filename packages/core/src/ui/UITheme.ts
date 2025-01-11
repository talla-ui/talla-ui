import {
	MessageDialogOptions,
	View,
	app,
	type RenderContext,
} from "../app/index.js";
import { ConfigOptions, type StringConvertible } from "../base/index.js";
import type { UIColor } from "./UIColor.js";
import type { UIComponent } from "./UIComponent.js";
import type { UIIconResource } from "./UIIconResource.js";
import { UIStyle } from "./UIStyle.js";

/** Default row spacing and separator margin for new themes */
const BASE_SPACING = 8;

/** Default dark text color */
const BASE_DARK_TEXT_COLOR = "#000000";

/** Default light text color */
const BASE_LIGHT_TEXT_COLOR = "#ffffff";

/**
 * A collection of default style options, colors, animations, effects, and icons, part of the global application context
 *
 * @description
 * The current application theme is available through the {@link AppContext.theme app.theme} property.
 *
 * To change the theme, create a new theme using {@link UITheme.clone()} and update styles, icons, animations, effects, and/or colors. The view for all activities will be re-rendered automatically.
 *
 */
export class UITheme {
	/** Returns the row spacing value from the current theme, or a default value */
	static getSpacing() {
		return app.theme ? app.theme.rowSpacing : BASE_SPACING;
	}

	/** Default spacing between components in a row, defaults to 8 */
	rowSpacing: string | number = BASE_SPACING;

	/** Default margin around separator components, defaults to 8 */
	separatorMargin: string | number = BASE_SPACING;

	/** Default icon and chevron icon size, in pixels or string with unit; no default */
	iconSize?: string | number;

	/** Default dark text color, defaults to `#000000` */
	darkTextColor: string = BASE_DARK_TEXT_COLOR;

	/** Default light text color, defaults to `#ffffff` */
	lightTextColor: string = BASE_LIGHT_TEXT_COLOR;

	/** An object that contains functions that are used for creating various modal views */
	modalFactory?: UITheme.ModalControllerFactory;

	/**
	 * A map that defines a set of predefined colors
	 *
	 * @description
	 * The colors defined by this map are used by {@link UIColor} objects that are instantiated with the color name, e.g. `ui.color("Primary")` (which returns `new UIColor("Primary")`). Default colors are also available as static properties of `ui.color()`, e.g. `ui.color.PRIMARY`.
	 *
	 * Styles and colors are cached during rendering. To apply changes to existing views, set a new theme rather than modifying this object.
	 *
	 * @example
	 * useWebContext((options) => {
	 *   options.theme.colors.set("Background", ui.color.DARKER_GRAY);
	 *   options.theme.colors.set("Foo", ui.color("#e0b0ff"))
	 *   // ...
	 * });
	 */
	colors = new Map<string, UIColor>();

	/**
	 * A map that defines a set of predefined icons
	 *
	 * @description
	 * The icons defined by this map are used by {@link UIIconResource} objects that are instantiated with the icon name, e.g. `ui.icon("Menu")` (which returns `new UIIconResource("Menu")`). Default icons are also available as static properties of `ui.icon()`, e.g. `ui.icon.MENU`.
	 *
	 * Icon changes may not be applied to views that are already rendered. If needed, re-render content using `app.renderer.remount()`.
	 */
	icons = new Map<string, UIIconResource>();

	/**
	 * A map that defines a set of predefined output transform animations
	 *
	 * @description
	 * The animations defined by this map can be used with the {@link AppContext.animateAsync} method, as well as {@link UIAnimationView} and the animations set on the {@link RenderContext.PlacementOptions} object. Default animations are also available as static properties of `ui.animation()`, e.g. `ui.animation.FADE_IN`.
	 */
	animations = new Map<string, RenderContext.OutputTransformer>();

	/**
	 * A map that defines a set of predefined output effects
	 *
	 * @description
	 * The effects defined by this map can be used on rendered cell output (see {@link UICell.effect}), using `ui.effect()`. Default effects are available as static properties of `ui.effect`, e.g. `ui.effect.SHADOW`.
	 */
	effects = new Map<string, RenderContext.OutputEffect>();

	/**
	 * A map that defines a set of predefined styles
	 *
	 * @description
	 * This map includes base style definitions that are applied to instances of {@link UIStyle}. Each key is a base style name, and each value is a list of style definitions (as an array).
	 *
	 * These style definitions are used by default styles (and any extensions or overrides) available as static properties of `ui.style()`, e.g. `ui.style.BUTTON`. To modify styles, _add_ objects with style definitions to each array. The format of style definitions is the same as the arguments of {@link UIStyle.extend}.
	 *
	 * Styles and colors are cached during rendering. To apply changes to existing views, set a new theme rather than modifying this object.
	 *
	 * @example
	 * useWebContext((options) => {
	 *   options.theme.styles.set("Button", [
	 *     ...options.theme.styles.get("Button")!,
	 *     { minHeight: 48 },
	 *   ]);
	 *   // ... (apply the same to other button styles)
	 * });
	 */
	styles: Map<string, UIStyle.StyleSelectorList<any>> = new Map();

	/** Returns a new {@link UITheme} object that's a clone of this object */
	clone() {
		let result = new UITheme();
		result.rowSpacing = this.rowSpacing;
		result.modalFactory = this.modalFactory;
		result.darkTextColor = this.darkTextColor;
		result.lightTextColor = this.lightTextColor;
		result.icons = new Map(this.icons);
		result.colors = new Map(this.colors);
		result.styles = new Map(this.styles) as any;
		result.animations = new Map(this.animations);
		result.effects = new Map(this.effects);
		return result;
	}
}

export namespace UITheme {
	/**
	 * An interface that defines methods for creating modal views
	 * - An object of this type should be assigned to {@link UITheme.modalFactory}, which is used by the `app` methods that display modal view components, as well as {@link Activity} when using the `dialog` rendering mode.
	 */
	export interface ModalControllerFactory {
		/** A factory method that returns an instance that implements the {@link DialogController} interface, for the provided view */
		buildDialog?: (view: View) => DialogController;
		/** A factory method that returns an instance that implements the {@link AlertDialogController} interface, using the provided dialog options */
		buildAlertDialog?: (options: MessageDialogOptions) => AlertDialogController;
		/** A factory method that returns an instance that implements the {@link ConfirmDialogController} interface, using the provided dialog options */
		buildConfirmDialog?: (
			options: MessageDialogOptions,
		) => ConfirmDialogController;
		/** A factory method that returns an instance that implements the {@link MenuController} interface, using the provided menu options */
		buildMenu?: (options: MenuOptions) => MenuController;
	}

	/**
	 * An interface for a class that manages a modal dialog view
	 * @see {@link UITheme.ModalControllerFactory}
	 */
	export interface DialogController {
		/** Display the dialog, until the content view is unlinked */
		show(place?: Partial<RenderContext.PlacementOptions>): void;
	}

	/**
	 * An interface for a class that manages a modal alert dialog view
	 * @see {@link UITheme.ModalControllerFactory}
	 */
	export interface AlertDialogController {
		/** Display the dialog */
		showAsync(
			place?: Partial<RenderContext.PlacementOptions>,
		): Promise<unknown>;
	}

	/**
	 * An interface for a class that manages a modal confirmation dialog view
	 * @see {@link UITheme.ModalControllerFactory}
	 */
	export interface ConfirmDialogController {
		/** Display the dialog */
		showAsync(
			place?: Partial<RenderContext.PlacementOptions>,
		): Promise<{ confirmed: boolean; other?: boolean }>;
	}

	/**
	 * An interface for a class that manages a modal (dropdown) menu view
	 * @see {@link UITheme.ModalControllerFactory}
	 */
	export interface MenuController {
		/** Display the menu and get the result */
		showAsync(
			place?: Partial<RenderContext.PlacementOptions>,
		): Promise<{ key: string } | undefined>;
	}

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
				labelStyle?: UIComponent.TextStyle;
				hintStyle?: UIComponent.TextStyle;
				disabled?: boolean;
				separate?: never;
		  }
		| {
				key?: never;
				separate: true;
		  };

	/**
	 * A class that contains options for the display of a modal menu
	 * @see {@link UITheme.MenuController}
	 */
	export class MenuOptions extends ConfigOptions {
		/**
		 * Creates a new object with the specified options
		 * @param items List of items to be included in the menu
		 * @param width Target width of the menu, in pixels or CSS length with unit (optional)
		 */
		constructor(items: MenuItem[] = [], width?: string | number) {
			super();
			this.items = items;
			this.width = width;
		}

		/** List of items to be included in the menu */
		items: MenuItem[];

		/** Target width of the menu, in pixels or CSS length with unit */
		width?: string | number;
	}
}
