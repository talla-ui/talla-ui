import { app } from "../../app/index.js";

/** Next 'random' ID assigned if style definition doesn't specify one */
let _nextStyleId = 0x1234;

/**
 * A class that represents a collection of styles that can be applied to UI elements
 *
 * @description
 * The UIStyle class manages style definitions that can be applied to UI elements. Style properties are defined as objects, with each property representing a style value (e.g. text color, font family, padding, etc.). Multiple objects can be combined to create a list of style definitions, which can be applied to UI elements based on their state (e.g. hovered, pressed, focused, etc.).
 *
 * The type parameter `TDefinition` is used to define the type of style properties that can be applied, which depends on the UI element being styled.
 *
 * Styles can be created directly with style definitions, inherited from other styles (extended with additional style properties), and further overridden (with properties that may be applied directly to a UI element rather than reused). Note that properties of UI element objects may further override style properties.
 *
 * Styles are resolved at runtime based on the current theme and any inherited styles. The resulting styles are cached, until the theme is changed using {@link AppContext.theme app.theme}.
 *
 * @example
 * // Create a button style and use it on a button builder
 * const myButtonStyle = ui.styles.BUTTON_PLAIN.extend({
 *   background: ui.color.YELLOW
 * });
 * const btn = ui.button({ label: "Sunny", style: myStyle })
 */
export class UIStyle<TDefinition> {
	/**
	 * Creates a new style instance
	 * - Rather than using this constructor directly, use the {@link extend()} and {@link override()} methods to create new styles based on existing styles from {@link ui.style}.
	 *
	 * @param styleOrThemeId Either a base style to inherit from, or a theme style identifier (a key of {@link UITheme.styles})
	 * @param styles Additional style definition(s) to apply
	 */
	constructor(
		styleOrThemeId?: UIStyle<TDefinition> | string,
		...styles: Readonly<UIStyle.StyleSelectorList<TDefinition>>
	) {
		if (typeof styleOrThemeId === "string") {
			this._id = this._themeId = styleOrThemeId;
		} else if (styleOrThemeId instanceof UIStyle) {
			this._id = styleOrThemeId._id + "_" + _nextStyleId++;
			this._inherits = styleOrThemeId;
		}
		this._styles = styles.length ? styles : undefined;
	}

	/**
	 * Returns an identifier for this style
	 * - This is used to cache style definitions and to identify styles in the theme
	 * - Instances created using {@link override()} have the same ID as the base style
	 */
	get id() {
		return this._id;
	}

	/**
	 * Creates a new style that inherits from this style and adds additional style definitions
	 * @param styles Additional style definitions to apply on top of inherited styles
	 * @returns A new {@link UIStyle} instance
	 */
	extend(
		...styles: Readonly<UIStyle.StyleSelectorList<TDefinition>>
	): UIStyle<TDefinition> {
		return new UIStyle<TDefinition>(this, ...styles);
	}

	/**
	 * Creates a new style that inherits from this style, adding overrides to be applied directly to a UI element
	 * @param styles Style definition objects containing values to override
	 * @returns A new {@link UIStyle} instance
	 */
	override(
		...styles: Readonly<TDefinition | undefined>[]
	): UIStyle<TDefinition> {
		let result = new UIStyle<TDefinition>();
		result._id = this._id;
		result._inherits = this;
		result._overrides = Object.assign({ ...this._overrides }, ...styles);
		return result;
	}

	/**
	 * Returns the complete list of style definitions for this style
	 * - The result includes inherited styles and theme styles, but not overrides applied using {@link override()}
	 * - Results are cached until the theme changes (using {@link AppContext.theme app.theme})
	 * @returns An array of style definition objects
	 */
	getStyles(): Readonly<UIStyle.StyleSelectorList<TDefinition>> {
		if (!this._styles && this._inherits) return this._inherits.getStyles();

		// return cached value if theme is still the same
		let theme = app.theme;
		if (this._cache && theme && this._theme === theme) {
			return this._cache;
		}
		this._theme = theme;

		// otherwise, compute value and cache it now
		let base =
			this._inherits?.getStyles() ||
			theme?.styles.get(this._themeId || "") ||
			[];
		return (this._cache = [...base, ...(this._styles || [])]);
	}

	/**
	 * Returns any overridden style values for this style, which should be applied directly to a UI element
	 * @returns The overridden style definition, if any
	 */
	getOverrides(): Readonly<TDefinition> | undefined {
		return this._overrides;
	}

	/** Style identifier */
	private _id?: string;

	/** Theme identifier, if this style is based on a theme style */
	private _themeId?: string;

	/** Reference to inherited base style, if any */
	private _inherits?: UIStyle<TDefinition>;

	/** List of style definitions */
	private _styles?: Readonly<UIStyle.StyleSelectorList<TDefinition>>;

	/** Overridden style values */
	private _overrides?: Readonly<TDefinition> | undefined;

	/** Cached computed styles */
	private _cache?: any;

	/** Reference to theme used for cached styles */
	private _theme?: unknown;
}

export namespace UIStyle {
	/** A property that is used on {@link StyleStateOptions} to apply styles to hovered elements (and not disabled, pressed, or focused) */
	export const STATE_HOVERED = Symbol("hovered");

	/** A property that is used on {@link StyleStateOptions} to apply styles to pressed elements */
	export const STATE_PRESSED = Symbol("pressed");

	/** A property that is used on {@link StyleStateOptions} to apply styles to focused elements */
	export const STATE_FOCUSED = Symbol("focused");

	/** A property that is used on {@link StyleStateOptions} to apply styles to readonly elements */
	export const STATE_READONLY = Symbol("readonly");

	/** A property that is used on {@link StyleStateOptions} to apply styles to disabled elements */
	export const STATE_DISABLED = Symbol("disabled");

	/**
	 * Type definition for an object that includes style state options
	 * - These options determine when styles should be applied based on element state
	 * @see {@link UIStyle.StyleSelectorList}
	 */
	export type StyleStateOptions = {
		[STATE_HOVERED]?: boolean;
		[STATE_PRESSED]?: boolean;
		[STATE_FOCUSED]?: boolean;
		[STATE_READONLY]?: boolean;
		[STATE_DISABLED]?: boolean;
	};

	/**
	 * Type definition for a list of style definitions
	 * - Each definition can include both style values and state options
	 */
	export type StyleSelectorList<TDefinition> = Readonly<
		TDefinition & StyleStateOptions
	>[];
}
