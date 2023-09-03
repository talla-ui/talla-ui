import type { StringConvertible } from "../core/index.js";
import { RenderContext, app } from "../app/index.js";
import { UIColor } from "./UIColor.js";
import { UIIcon } from "./UIIcon.js";
import { UIStyle } from "./UIStyle.js";
import { getDefaultColors, getDefaultStyles } from "./UITheme_defaults.js";

/** Default `spacing` for new themes */
const BASE_ROW_SPACING = 8;

/** Default modalDialogShadeOpacity for new themes */
const BASE_MODAL_OPACITY = 0.3;

/** Empty default theme, initialized by `getStyle` or `getColor` if no theme has been set */
let _baseTheme: UITheme | undefined;

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
	/**
	 * Returns a `UIColor` instance for the specified color name, from the current theme
	 * - If no theme is currently set, a color from the default set of colors is returned.
	 */
	static getColor(name: string) {
		let colors = (app.theme || _baseTheme || (_baseTheme = new UITheme()))
			.colors;
		return colors[name] || new UIColor();
	}

	/**
	 * Returns a `UIIcon` instance for the specified icon name, from the current theme
	 * - If no theme is currently set, a color from the default set of icons is returned.
	 */
	static getIcon(name: string) {
		let icons = (app.theme || _baseTheme || (_baseTheme = new UITheme())).icons;
		return icons[name] || new UIIcon("");
	}

	/**
	 * Returns a `UIStyle` instance for the specified style name, from the current theme
	 * - If no theme is currently set, a style from the default set of styles is returned.
	 */
	static getStyle(name: string) {
		let styles = (app.theme || _baseTheme || (_baseTheme = new UITheme()))
			.styles;
		return styles[name] || new UIStyle(name + "_0");
	}

	/** Returns the default row spacing value from the current theme, or default */
	static getRowSpacing() {
		return app.theme ? app.theme.rowSpacing : BASE_ROW_SPACING;
	}

	/** Returns the modal dialog backdrop shade value from the current theme, or default */
	static getModalDialogShadeOpacity() {
		return app.theme ? app.theme.modalDialogShadeOpacity : BASE_MODAL_OPACITY;
	}

	/** Returns a named output (transformation) animation from the current theme */
	static getAnimation(name?: string) {
		let animations = app.theme && app.theme.animations;
		return name && animations ? animations[name] : undefined;
	}

	/** Dialog backdrop shader opacity (for {@link DialogViewActivity}), defaults to 0.3 */
	modalDialogShadeOpacity = BASE_MODAL_OPACITY;

	/** Default spacing between components in a row, defaults to 8 */
	rowSpacing: string | number = BASE_ROW_SPACING;

	/** An object that contains functions that are used for creating various modal views */
	modalFactory?: UITheme.ModalControllerFactory;

	/**
	 * An object that defines a set of predefined colors
	 *
	 * @description
	 * The colors defined by this object are used by predefined {@link UIColor} objects, e.g. `UIColor.Green` and `UIColor.Primary`. Properties of this object are capitalized in the same way as these object names.
	 *
	 * Additional colors may be defined by an application. These can be referenced by new {@link UIColor} instances, constructed using the name of the new color prefixed with `@` — e.g. `new UIColor("@MyColor")`.
	 *
	 * The following colors are set by default:
	 * - Black
	 * - DarkerGray
	 * - DarkGray
	 * - Gray
	 * - LightGray
	 * - White
	 * - Slate
	 * - LightSlate
	 * - Red
	 * - Orange
	 * - Yellow
	 * - Lime
	 * - Green
	 * - Turquoise
	 * - Cyan
	 * - Blue
	 * - Violet
	 * - Purple
	 * - Magenta
	 * - Primary
	 * - PrimaryBackground
	 * - Accent
	 * - PageBackground
	 * - Background
	 * - Text
	 * - Separator
	 * - ControlBase
	 * - ModalShade
	 *
	 * Color changes are not applied to views that are already rendered. Use the {@link RenderContext.remount()} method to update views after modifying a theme or setting a new theme.
	 *
	 * @note Color values are cached by {@link UIColor}, hence any changes to individual colors won't take effect if properties are set one by one. Either use the {@link UITheme.clone()} method, or set this property to a new object.
	 */
	colors: { [name: string]: UIColor } = Object.assign(
		Object.create(null),
		getDefaultColors(),
	);

	/**
	 * An object that defines a set of predefined UI component styles
	 *
	 * @description
	 * The styles defined by this object are used by predefined {@link UIStyle} objects, e.g. `UIStyle.Label` and `UIStyle.PrimaryButton`. Properties of this object are capitalized in the same way as these object names. Note that Container, Cell, Column, Row, Separator, and Spacer styles are not defined by this object since they can't be customized.
	 *
	 * Additional styles may be defined by an application. These can be referenced by new {@link UIStyle} instances, constructed using the name of the new style prefixed with `@` — e.g. `new UIStyle("@MyStyle")`. This way, styles can be changed dynamically by changing the {@link UITheme} object.
	 *
	 * The following styles are set by default:
	 * - Control
	 * - Button
	 * - BorderlessButton
	 * - PrimaryButton
	 * - OutlineButton
	 * - LinkButton
	 * - IconButton
	 * - TextField
	 * - BorderlessTextField
	 * - Toggle
	 * - Label
	 * - CloseLabel
	 * - Paragraph
	 * - Heading1
	 * - Heading2
	 * - Heading3
	 * - Image
	 *
	 * Style changes are not applied to views that are already rendered. Use the {@link RenderContext.remount()} method to update views after modifying a theme or setting a new theme.
	 */
	styles: { [name: string]: UIStyle } = Object.assign(
		Object.create(null),
		getDefaultStyles(),
	);

	/**
	 * An object that defines a set of predefined icons
	 *
	 * @description
	 * The icons defined by this object are used by predefined {@link UIIcon} objects, e.g. `UIIcon.Close`. Properties of this object are capitalized in the same way as these object names. Additional styles may be defined by an application. These can be referenced by new {@link UIIcon} instances, constructed using the name of the new icon prefixed with `@` — e.g. `new UIIcon("@MyIcon")`. This way, icons can be changed dynamically by changing the {@link UITheme} object.
	 *
	 * The following basic icons are defined by default:
	 * - Blank
	 * - Close
	 * - Check
	 * - Menu
	 * - More
	 * - Plus
	 * - Minus
	 * - ExpandDown
	 * - ExpandUp
	 * - ExpandRight
	 * - ExpandLeft
	 *
	 * Icon changes are not applied to views that are already rendered. Use the {@link RenderContext.remount()} method to update views after modifying a theme or setting a new theme.
	 */
	icons: { [name: string]: UIIcon } = Object.create(null);

	/**
	 * An object that defines a set of predefined output transform animations
	 *
	 * @description
	 * The animations defined by this object can be used with the {@link GlobalContext.animateAsync} method, as well as {@link UIAnimationController} and the animations set on the {@link RenderContext.PlacementOptions} object.
	 */
	animations: {
		readonly [name: string]: RenderContext.OutputTransformer;
	} = Object.create(null);

	/** Returns a new {@link UITheme} object that's a clone of this object */
	clone() {
		let result = new UITheme();
		result.modalDialogShadeOpacity = this.modalDialogShadeOpacity;
		result.rowSpacing = this.rowSpacing;
		result.modalFactory = this.modalFactory;
		Object.assign(result.icons, this.icons);
		Object.assign(result.colors, this.colors);
		Object.assign(result.styles, this.styles);
		Object.assign(result.animations, this.animations);
		return result;
	}
}

export namespace UITheme {
	/**
	 * An interface that defines methods for creating modal views
	 * - An object of this type should be assigned to {@link UITheme.modalFactory}, which is used by the `app` methods that display modal view components.
	 */
	export interface ModalControllerFactory {
		createAlertDialog?: () => AlertDialogController;
		createConfirmationDialog?: () => ConfirmationDialogController;
		createMenu?: () => MenuController;
	}

	/**
	 * An interface for a class that manages a modal alert dialog view
	 * - A class of this type should be included in {@link ModalControllerFactory}.
	 */
	export interface AlertDialogController {
		/** Set the dialog title */
		setTitle(title: StringConvertible): this;
		/** Add a block of text to be displayed as a paragraph */
		addMessage(message: StringConvertible): this;
		/** Set the text label of the primary dismiss button */
		setButtonLabel(label: StringConvertible): this;
		/** Display the dialog */
		showAsync(
			place?: Partial<RenderContext.PlacementOptions>,
		): Promise<unknown>;
	}

	/**
	 * An interface for a class that manages a modal confirmation dialog view
	 * - A class of this type should be included in {@link ModalControllerFactory}.
	 */
	export interface ConfirmationDialogController {
		/** Set the dialog title */
		setTitle(title: StringConvertible): this;
		/** Add a block of text to be displayed as a paragraph */
		addMessage(message: StringConvertible): this;
		/** Set the text label of the primary confirmation button */
		setConfirmButtonLabel(label: StringConvertible): this;
		/** Set the text label of the cancel button */
		setCancelButtonLabel(label: StringConvertible): this;
		/** Display the dialog and get the result */
		showAsync(
			place?: Partial<RenderContext.PlacementOptions>,
		): Promise<{ confirmed: boolean }>;
	}

	/**
	 * An interface for a class that manages a modal (dropdown) menu view
	 * - A class of this type should be included in {@link ModalControllerFactory}.
	 */
	export interface MenuController {
		/** Add a menu item with the provided key, text, icon, and hint */
		addItem(item: MenuItem): this;
		/** Add a list of selectable menu items */
		addItemGroup(
			items: MenuItem[],
			selectedKey?: string,
			textStyle?: UIStyle.Definition.TextStyle,
		): this;
		/** Set the target width of the menu, if possible */
		setWidth(width: number): this;
		/** Display the menu and get the result */
		showAsync(
			place?: Partial<RenderContext.PlacementOptions>,
		): Promise<{ key?: string }>;
	}

	/** An object that represents a menu item, used by {@link UITheme.MenuController} */
	export type MenuItem = {
		key: string;
		text?: StringConvertible;
		icon?: UIIcon | `@${string}`;
		hint?: StringConvertible;
		hintIcon?: UIIcon | `@${string}`;
		textStyle?: UIStyle.Definition.TextStyle;
		hintStyle?: UIStyle.Definition.TextStyle;
		separate?: boolean;
	};
}
