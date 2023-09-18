import { app, MessageDialogOptions, type RenderContext } from "../app/index.js";
import { ConfigOptions, type StringConvertible } from "../base/index.js";
import type { UIColor } from "./UIColor.js";
import type { UIComponent } from "./UIComponent.js";
import type { UIIconResource } from "./UIIconResource.js";
import type {
	UIButtonStyle,
	UICellStyle,
	UIImageStyle,
	UILabelStyle,
	UITextFieldStyle,
	UIToggleLabelStyle,
	UIToggleStyle,
} from "./index.js";

/** Default row `spacing` for new themes */
const BASE_ROW_SPACING = 8;

/** Default separator `margin` for new themes */
const BASE_SEPARATOR_MARGIN = 8;

/** Default modalDialogShadeOpacity for new themes */
const BASE_MODAL_OPACITY = 0.3;

/** Default dark text color */
const BASE_DARK_TEXT_COLOR = "#000000";

/** Default light text color */
const BASE_LIGHT_TEXT_COLOR = "#ffffff";

/** Next 'random' ID assigned if style definition doesn't specify one */
let _nextStyleId = 0x1234;

/**
 * A collection of default style options, colors, animations, and icons, part of the global application context
 *
 * @description
 * The current application theme is available through the {@link GlobalContext.theme app.theme} property.
 *
 * To change the theme, either update the styles, icons, animations, and/or colors objects for the current theme, or create a new theme using {@link UITheme.clone()} and assign further properties afterwards.
 *
 * Theme changes are not applied to views that are already rendered. Use the {@link RenderContext.remount()} method to update views after modifying a theme or setting a new theme.
 */
export class UITheme {
	/** Returns the default row spacing value from the current theme, or default */
	static getRowSpacing() {
		return app.theme ? app.theme.rowSpacing : BASE_ROW_SPACING;
	}

	/** Returns the default separator margin value from the current theme, or default */
	static getSeparatorMargin() {
		return app.theme ? app.theme.separatorMargin : BASE_SEPARATOR_MARGIN;
	}

	/** Returns the modal dialog backdrop shade value from the current theme, or default */
	static getModalDialogShadeOpacity() {
		return app.theme ? app.theme.modalDialogShadeOpacity : BASE_MODAL_OPACITY;
	}

	/** Dialog backdrop shader opacity (for {@link DialogViewActivity}), defaults to 0.3 */
	modalDialogShadeOpacity = BASE_MODAL_OPACITY;

	/** Default spacing between components in a row, defaults to 8 */
	rowSpacing: string | number = BASE_ROW_SPACING;

	/** Default margin around separator components, defaults to 8 */
	separatorMargin: string | number = BASE_SEPARATOR_MARGIN;

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
	 * The colors defined by this map are used by predefined {@link UIColor} objects, e.g. `UIColor["@green"]` and `UIColor["@primary"]`. Keys of this map are capitalized in the same way as these object names.
	 *
	 * Additional colors may be defined by an application. These can be referenced by new {@link UIColor} instances, constructed using the name of the new color prefixed with `@` — e.g. `new UIColor("@myColor")`.
	 *
	 * The following colors are set by default:
	 * - black
	 * - darkerGray
	 * - darkGray
	 * - gray
	 * - lightGray
	 * - white
	 * - slate
	 * - lightSlate
	 * - red
	 * - orange
	 * - yellow
	 * - lime
	 * - green
	 * - turquoise
	 * - cyan
	 * - blue
	 * - violet
	 * - purple
	 * - magenta
	 * - primary
	 * - primaryBackground
	 * - accent
	 * - pageBackground
	 * - background
	 * - text
	 * - separator
	 * - controlBase
	 * - modalShade
	 *
	 * Color changes are not applied to views that are already rendered. Use the {@link RenderContext.remount()} method to update views after modifying a theme or setting a new theme.
	 *
	 * @note Color values are cached by {@link UIColor}, hence any changes to individual colors won't take effect if keys are set one by one. Either use the {@link UITheme.clone()} method, or set this property to a new map.
	 *
	 * @example
	 * useWebContext((options) => {
	 *   options.theme.colors.set("background", UIColor["@darkerGray"]);
	 *   options.theme.colors.set("brand", "#e0b0ff")
	 *   // ...
	 * });
	 */
	colors = new Map<string, UIColor | string>();

	/**
	 * A map that defines a set of predefined icons
	 *
	 * @description
	 * The icons defined by this map are used by predefined {@link UIIconResource} objects, e.g. `UIIconResource["@close"]`. Keys of this map are capitalized in the same way as these object names. Additional icons may be defined by an application. These can be referenced by new {@link UIIconResource} instances, constructed using the name of the new icon prefixed with `@` — e.g. `new UIIconResource("@myIcon")`. This way, icons can be changed dynamically by changing the {@link UITheme} object.
	 *
	 * The following basic icons are defined by default:
	 * - blank
	 * - close
	 * - check
	 * - menu
	 * - more
	 * - plus
	 * - minus
	 * - expandDown
	 * - expandUp
	 * - expandRight
	 * - expandLeft
	 *
	 * Icon changes are not applied to views that are already rendered. Use the {@link RenderContext.remount()} method to update views after modifying a theme or setting a new theme.
	 */
	icons = new Map<string, UIIconResource>();

	/**
	 * A map that defines a set of predefined output transform animations
	 *
	 * @description
	 * The animations defined by this map can be used with the {@link GlobalContext.animateAsync} method, as well as {@link UIAnimationController} and the animations set on the {@link RenderContext.PlacementOptions} object.
	 *
	 * The following basic animations are defined by default:
	 * - fade-in
	 * - fade-out
	 * - fade-in-up
	 * - fade-in-down
	 * - fade-in-left
	 * - fade-in-right
	 * - fade-out-up
	 * - fade-out-down
	 * - fade-out-left
	 * - fade-out-right
	 * - show-dialog
	 * - hide-dialog
	 * - show-menu
	 * - hide-menu
	 */
	animations = new Map<string, RenderContext.OutputTransformer>();

	/**
	 * A map that defines a set of predefined styles
	 * - This map includes base style definitions that are applied to instances of {@link UITheme.BaseStyle}. Each key is a subclass, and each value is a list of style definitions (as an array). To change the base appearance of UI components, preferably _add_ objects with style definitions to each array. The format of style definitions is the same as the arguments of {@link BaseStyle.extend}.
	 *
	 * @example
	 * useWebContext((options) => {
	 *   options.theme.styles.set(UIButtonStyle, [
	 *     ...options.theme.styles.get(UIButtonStyle)!,
	 *     { minHeight: 48 },
	 *   ]);
	 *   // ... (apply the same to other button styles)
	 * });
	 */
	styles: UITheme.StyleMapType<UICellStyle> &
		UITheme.StyleMapType<UIButtonStyle> &
		UITheme.StyleMapType<UILabelStyle> &
		UITheme.StyleMapType<UIImageStyle> &
		UITheme.StyleMapType<UITextFieldStyle> &
		UITheme.StyleMapType<UIToggleStyle> &
		UITheme.StyleMapType<UIToggleLabelStyle> = new Map();

	/** Returns a new {@link UITheme} object that's a clone of this object */
	clone() {
		let result = new UITheme();
		result.modalDialogShadeOpacity = this.modalDialogShadeOpacity;
		result.rowSpacing = this.rowSpacing;
		result.modalFactory = this.modalFactory;
		result.darkTextColor = this.darkTextColor;
		result.lightTextColor = this.lightTextColor;
		result.icons = new Map(this.icons);
		result.colors = new Map(this.colors);
		result.styles = new Map(this.styles) as any;
		result.animations = new Map(this.animations);
		return result;
	}
}

export namespace UITheme {
	/** A property that is used on {@link StyleStateOptions} to apply styles to hovered elements */
	export const STATE_HOVERED = Symbol("hovered");
	/** A property that is used on {@link StyleStateOptions} to apply styles to pressed elements */
	export const STATE_PRESSED = Symbol("pressed");
	/** A property that is used on {@link StyleStateOptions} to apply styles to focused elements */
	export const STATE_FOCUSED = Symbol("focused");
	/** A property that is used on {@link StyleStateOptions} to apply styles to disabled elements */
	export const STATE_DISABLED = Symbol("disabled");
	/** A property that is used on {@link StyleStateOptions} to apply styles to readonly elements */
	export const STATE_READONLY = Symbol("readonly");

	/**
	 * Type definition for an object that includes style state options
	 * @see {@link UITheme.StyleSelectorList}
	 */
	export type StyleStateOptions = {
		[STATE_HOVERED]?: boolean;
		[STATE_PRESSED]?: boolean;
		[STATE_FOCUSED]?: boolean;
		[STATE_DISABLED]?: boolean;
		[STATE_READONLY]?: boolean;
	};

	/**
	 * Type definition for a map that defines a set of predefined styles
	 * @see {@link UITheme.styles}
	 */
	export type StyleMapType<
		TBaseStyle extends BaseStyle<string, any>,
		TDefinition = BaseStyle.DefinitionType<TBaseStyle>,
	> = Map<StyleClassType<TBaseStyle>, StyleSelectorList<TDefinition>>;

	/**
	 * Type definition for a list of styles that can be applied to a UI component
	 * @see {@link UITheme.styles}
	 * @see {@link UITheme.BaseStyle.extend}
	 */
	export type StyleSelectorList<TDefinition> = Readonly<
		TDefinition & StyleStateOptions
	>[];

	/**
	 * Type definition for values that can be used to apply styles to a UI component
	 * - Valid values include a subclass of {@link UITheme.BaseStyle} (such as {@link UIButtonStyle}), a style override (see {@link UITheme.BaseStyle.override}), a style definition object (with style properties such as `background`, `opacity`, `bold`, etc., determined by the styles included in the specific subclass of {@link UITheme.BaseStyle}).
	 * - This type is used for properties such as {@link UIButton.buttonStyle} and {@link UIToggle.labelStyle}.
	 * @see {@link UITheme.BaseStyle}
	 */
	export type StyleConfiguration<TBaseStyle> =
		| StyleClassType<TBaseStyle>
		| BaseStyle.StyleOverrides<TBaseStyle>
		| BaseStyle.DefinitionType<TBaseStyle>
		| undefined;

	/**
	 * Type definition for a base style class, or a class that extends a base style class
	 * - This type matches both built-in style classes (e.g. {@link UIButtonStyle}), as well as subclasses that are created by extending one of these classes — either by using the {@link UITheme.BaseStyle.extend} method, or by defining a subclass directly using the `extends` keyword.
	 */
	export type StyleClassType<TBaseStyle> = (new () => TBaseStyle) & {
		extend: (typeof BaseStyle)["extend"];
		override: (typeof BaseStyle)["override"];
	};

	/**
	 * A base class for defining styles that can be applied to UI components
	 *
	 * @description
	 * This class is used as a base class for defining styles that can be applied to UI components, such as {@link UIButtonStyle} and {@link UIToggleLabelStyle}.
	 *
	 * @note This class shouldn't be used directly, but subclasses should be created for specific component styles — either by extending the class, or using the static {@link extend()} method.
	 *
	 * @see {@link UICellStyle}
	 * @see {@link UIButtonStyle}
	 * @see {@link UIImageStyle}
	 * @see {@link UILabelStyle}
	 * @see {@link UITextFieldStyle}
	 * @see {@link UIToggleStyle}
	 *
	 * @example
	 * const MyButtonStyle = UIButtonStyle.extend({
	 *   background: UIColor["@primary"],
	 *   bold: true,
	 * });
	 *
	 * // apply to a button, e.g.:
	 * const view = UICell.with(
	 *   UIButton.with({
	 *     buttonStyle: MyButtonStyle,
	 *     label: "My Button",
	 *     onClick: "MyButtonClick"
	 *   }),
	 *   // or:
	 *   UIButton.withLabel("My Button", "MyButtonClick", MyButtonStyle),
	 * );
	 *
	 * @example
	 * // use the override method to apply styles directly
	 * const view = UICell.with(
	 *   UIButton.with({
	 *     buttonStyle: UIButtonStyle.override({
	 *       textColor: UIColor["@red"],
	 *     }),
	 *     label: "My Button",
	 *     onClick: "MyButtonClick"
	 *   }),
	 * );
	 */
	export abstract class BaseStyle<TypeString extends string, TDefinition> {
		/**
		 * Creates a new subclass that includes the original styles as well as new styles
		 * @param styles A list of style definitions to be added to the extended style; this may include multiple objects with different state options (see {@link StyleStateOptions}).
		 * @returns A subclass of {@link BaseStyle} that includes the specified styles
		 */
		static extend<TypeString extends string, TDefinition>(
			this: StyleClassType<BaseStyle<TypeString, TDefinition>>,
			...styles: Readonly<StyleSelectorList<TDefinition>>
		): typeof this {
			return class extends this {
				override getStyles() {
					return [...super.getStyles(), ...styles];
				}
			} as any;
		}

		/**
		 * Creates a style override object that can be used to apply base styles as well as the specified styles to a UI component
		 * @param styles A list of style definitions to be added to the extended style; these may _not_ include state options (see {@link StyleStateOptions}).
		 * @returns A style override object that can be used to apply the specified styles to a UI component (e.g. {@link UIButton.buttonStyle})
		 */
		static override<TypeString extends string, TDefinition>(
			this: StyleClassType<BaseStyle<TypeString, TDefinition>>,
			...styles: Readonly<TDefinition | undefined>[]
		): BaseStyle.StyleOverrides<BaseStyle<TypeString, TDefinition>> {
			return {
				[BaseStyle.OVERRIDES_BASE]: this,
				overrides: styles,
			};
		}

		/**
		 * Creates a new style object; do not use directly
		 * - This constructor is used by the renderer to declare each style once, and doesn't need to be used otherwise.
		 */
		constructor(type: `${string}${TypeString}`, BaseClass: Function) {
			let isBaseStyle = this.constructor === BaseClass;
			this.id = type + (isBaseStyle ? "" : "_" + _nextStyleId++);
			this.type = type;
			this.base = app.theme?.styles.get(BaseClass as any) || ([] as any[]);
		}

		/**
		 * Unique style ID
		 * - This property is set by the constructor, but can be changed afterwards as long as the value is unique across different styles.
		 */
		readonly id: string;

		/** Style type identifier */
		readonly type: `${string}${TypeString}`;

		/** Base styles, read from the current theme */
		readonly base: Readonly<StyleSelectorList<TDefinition>>;

		/**
		 * Returns the list of styles that should be applied to a UI component
		 * - This method is called by the renderer to declare each style once, and doesn't need to be called otherwise. It can be overridden to modify or add styles.
		 * - The static {@link extend()} method returns a subclass that overrides this method to include the specified styles.
		 */
		getStyles(): Readonly<StyleSelectorList<TDefinition>> {
			return this.base;
		}
	}

	export namespace BaseStyle {
		/** Symbol that's used on override objects to reference the base style class */
		export const OVERRIDES_BASE = Symbol("style");

		/** Type definition that's used to infer the definition object type for a base style class */
		export type DefinitionType<TBaseStyle> = TBaseStyle extends BaseStyle<
			string,
			infer TDefinition
		>
			? TDefinition
			: never;

		/**
		 * An object that includes a base style reference and style overrides
		 * - This object is produced by {@link BaseStyle.override()} and accepted as a valid value for the {@link UITheme.StyleConfiguration} type.
		 */
		export type StyleOverrides<TBaseStyle> = {
			[BaseStyle.OVERRIDES_BASE]: StyleClassType<TBaseStyle>;
			overrides: Array<
				Readonly<BaseStyle.DefinitionType<TBaseStyle>> | undefined
			>;
		};
	}

	/**
	 * An interface that defines methods for creating modal views
	 * - An object of this type should be assigned to {@link UITheme.modalFactory}, which is used by the `app` methods that display modal view components.
	 */
	export interface ModalControllerFactory {
		buildAlertDialog?: (options: MessageDialogOptions) => AlertDialogController;
		buildConfirmDialog?: (
			options: MessageDialogOptions,
		) => ConfirmDialogController;
		buildMenu?: (options: MenuOptions) => MenuController;
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
				icon?: UIIconResource | `@${string}`;
				hint?: StringConvertible;
				hintIcon?: UIIconResource | `@${string}`;
				labelStyle?: UIComponent.TextStyleType;
				hintStyle?: UIComponent.TextStyleType;
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
