import { StyleOverrides, UI, UIColor, UIIconResource } from "@talla-ui/core";
import { makeDefaultColors } from "./defaults/colors.js";
import { makeDefaultIcons } from "./defaults/icons.js";
import { makeButtonStyles, makeTextFieldStyles } from "./defaults/styles.js";
import { ModalMenu } from "./modals/ModalMenu.js";
import { UITextRenderer } from "./observers/UITextRenderer.js";

/**
 * A type that represents a style definition for themed CSS classes.
 * - Uses StyleOverrides from core for base properties (supports UIColor).
 * - Adds state keys: `+hover`, `+focus`, `+pressed`, `+disabled`, `+readonly`.
 * - Adds CSS selector keys (`:` or `[` prefix, e.g. `:first-child`, `[data-foo]`).
 */
export type WebStyleDefinition = StyleOverrides & {
	"+hover"?: StyleOverrides;
	"+focus"?: StyleOverrides;
	"+pressed"?: StyleOverrides;
	"+disabled"?: StyleOverrides;
	"+readonly"?: StyleOverrides;
	[selector: `:${string}` | `[${string}`]: StyleOverrides | undefined;
};

/** @internal Theme options type for scalar configuration values. */
export type WebThemeOptions = {
	updateBodyStyle: boolean;
	pageBackground: UIColor.BackgroundType;
	modalShadeBackground: UIColor.BackgroundType;
	logicalPxScale?: number;
	logicalPxScaleNarrow?: number;
	iconSize: number;
	iconMargin: number;
	menuOffset: number;
	controlTextStyle?: StyleOverrides;
	smallerFontSize?: number;
	largerFontSize?: number;
	focusDecoration?: StyleOverrides;
};

/** @internal Theme data structure returned by {@link WebTheme.getThemeData()}. */
export type WebThemeData = {
	colors: Record<string, UIColor>;
	icons: Record<string, UIIconResource>;
	buttonStyles: Record<string, WebTheme.StyleDefinition>;
	textFieldStyles: Record<string, WebTheme.StyleDefinition>;
	imports: string[];
	options: WebThemeOptions;
};

/**
 * A class that represents a complete visual theme configuration.
 * - Create a new theme using `new WebTheme()` which initializes with all defaults.
 * - Use fluent methods to customize named colors, icons, and styles.
 * - Apply a theme using {@link setWebTheme()}.
 *
 * @example
 * // Create a theme with custom colors
 * const myTheme = new WebTheme()
 *   .colors({ accent: "#FF5722" })
 *   .darkColors({ accent: "#FF7043" });
 *
 * // Apply the theme
 * setWebTheme(myTheme);
 */
export class WebTheme {
	/**
	 * Creates a new theme initialized with all default values.
	 * - Colors, icons, and styles are copied from defaults.
	 * - Each instance is independent; modifying one does not affect others.
	 */
	constructor() {
		this._colors = makeDefaultColors();
		this._darkColors = {};
		this._icons = makeDefaultIcons();
		this._darkIcons = {};
		this._buttonStyles = makeButtonStyles();
		this._textFieldStyles = makeTextFieldStyles();

		// Initialize options with defaults
		this._options = {
			pageBackground: UI.colors.background,
			modalShadeBackground: UI.colors.text.brighten(-0.8).alpha(0.3),
			iconMargin: UITextRenderer.ICON_DEFAULTS.margin,
			iconSize: UITextRenderer.ICON_DEFAULTS.size,
			menuOffset: ModalMenu.OFFSET_DEFAULT,
			updateBodyStyle: true,
		};
	}

	/**
	 * Sets color overrides, merged with existing colors.
	 * - These colors are used in light mode, or always if no dark colors are set.
	 * @param overrides Color name to value mapping.
	 * @returns The theme itself, for method chaining.
	 *
	 * @example
	 * theme.colors({
	 *   accent: "#FF5722",
	 *   background: "#FFFFFF",
	 *   text: "#333333",
	 * });
	 */
	colors(
		overrides: Partial<Record<UIColor.ColorName, UIColor | string>>,
	): this {
		for (const key in overrides) {
			const value = overrides[key as UIColor.ColorName];
			if (value !== undefined) {
				this._colors[key] =
					value instanceof UIColor ? value : new UIColor(value);
			}
		}
		return this;
	}

	/**
	 * Sets dark mode color overrides.
	 * - These colors are applied on top of base colors when dark mode is active.
	 * - If not set, the theme does not respond to dark mode preference.
	 * @param overrides Color name to value mapping.
	 * @returns The theme itself, for method chaining.
	 *
	 * @example
	 * theme.darkColors({
	 *   accent: "#BB86FC",
	 *   background: "#121212",
	 *   text: "#FFFFFF",
	 * });
	 */
	darkColors(
		overrides: Partial<Record<UIColor.ColorName, UIColor | string>>,
	): this {
		for (const key in overrides) {
			const value = overrides[key as UIColor.ColorName];
			if (value !== undefined) {
				this._darkColors[key] =
					value instanceof UIColor ? value : new UIColor(value);
			}
		}
		return this;
	}

	/**
	 * Sets icon overrides, merged with existing icons.
	 * - These icons are used in light mode, or always if no dark icons are set.
	 * @param overrides Icon name to resource mapping.
	 * @returns The theme itself, for method chaining.
	 */
	icons(
		overrides: Partial<Record<UIIconResource.IconName, UIIconResource>>,
	): this {
		Object.assign(this._icons, overrides);
		return this;
	}

	/**
	 * Sets dark mode icon overrides.
	 * - These icons are applied on top of base icons when dark mode is active.
	 * @param overrides Icon name to resource mapping.
	 * @returns The theme itself, for method chaining.
	 */
	darkIcons(
		overrides: Partial<Record<UIIconResource.IconName, UIIconResource>>,
	): this {
		Object.assign(this._darkIcons, overrides);
		return this;
	}

	/**
	 * Defines or overrides a button variant style.
	 * - Deep-merges overrides with the existing variant definition.
	 * @param variant The variant name (e.g., "default", "accent", "ghost").
	 * @param overrides Style properties to set or override.
	 * @returns The theme itself, for method chaining.
	 *
	 * @example
	 * theme.buttonStyle("default", { borderRadius: 20 });
	 */
	buttonStyle(variant: string, overrides: WebTheme.StyleDefinition): this {
		_applyVariant(this._buttonStyles, variant, overrides);
		return this;
	}

	/**
	 * Defines or overrides a text field variant style.
	 * - Deep-merges overrides with the existing variant definition.
	 * @param variant The variant name: "default" or "ghost".
	 * @param overrides Style properties to set or override.
	 * @returns The theme itself, for method chaining.
	 *
	 * @example
	 * theme.textFieldStyle("default", { borderRadius: 8 });
	 */
	textFieldStyle(variant: string, overrides: WebTheme.StyleDefinition): this {
		_applyVariant(this._textFieldStyles, variant, overrides);
		return this;
	}

	/**
	 * Sets the control text style (font family, size, line height).
	 * - Applies to all text controls globally.
	 * @param style Style overrides for text controls.
	 * @returns The theme itself, for method chaining.
	 */
	controlTextStyle(style: StyleOverrides): this {
		this._options.controlTextStyle = {
			...this._options.controlTextStyle,
			...style,
		};
		return this;
	}

	/**
	 * Sets the font size for all controls.
	 * - The `smaller` and `larger` properties determine the font size used for text elements that have {@link UIText.TextBuilder.smaller() smaller()} or {@link UIText.TextBuilder.larger()} applied to them, respectively.
	 * - Font sizes are always converted to `rem` units, respecting the values of {@link logicalPxScale()}.
	 * @param sizes Font sizes in pixels, for body (regular), smaller, and larger text.
	 * @returns The theme itself, for method chaining.
	 */
	fontSize(sizes: { body: number; smaller: number; larger: number }): this {
		this._options.controlTextStyle = {
			...this._options.controlTextStyle,
			fontSize: sizes.body,
		};
		this._options.smallerFontSize = sizes.smaller;
		this._options.largerFontSize = sizes.larger;
		return this;
	}

	/**
	 * Sets the focus decoration style (outline appearance).
	 * @param style Style overrides for focus decoration.
	 * @returns The theme itself, for method chaining.
	 */
	focusDecoration(style: StyleOverrides): this {
		this._options.focusDecoration = {
			...this._options.focusDecoration,
			...style,
		};
		return this;
	}

	/**
	 * Sets the page background color.
	 * @param color The background color value.
	 * @returns The theme itself, for method chaining.
	 */
	pageBackground(color: UIColor.BackgroundType): this {
		this._options.pageBackground = color;
		return this;
	}

	/**
	 * Sets the modal shade (backdrop) background color.
	 * @param color The background color value.
	 * @returns The theme itself, for method chaining.
	 */
	modalShadeBackground(color: UIColor.BackgroundType): this {
		this._options.modalShadeBackground = color;
		return this;
	}

	/**
	 * Sets the logical pixel scale factor.
	 * @param scale The scale factor; defaults to 1.
	 * @param narrowScale The scale factor for narrow screens; defaults to 16/14.
	 * @returns The theme itself, for method chaining.
	 */
	logicalPxScale(scale: number, narrowScale?: number): this {
		this._options.logicalPxScale = scale;
		if (narrowScale !== undefined) {
			this._options.logicalPxScaleNarrow = narrowScale;
		}
		return this;
	}

	/**
	 * Sets the default icon size and margin.
	 * @param size The icon size in pixels.
	 * @param margin The icon margin in pixels.
	 * @returns The theme itself, for method chaining.
	 */
	defaultIconStyle(size: number, margin?: number): this {
		this._options.iconSize = size;
		if (margin !== undefined) this._options.iconMargin = margin;
		return this;
	}

	/**
	 * Sets the default modal menu offset from the reference element.
	 * @param offset The offset in pixels.
	 * @returns The theme itself, for method chaining.
	 */
	defaultMenuOffset(offset: number): this {
		this._options.menuOffset = offset;
		return this;
	}

	/**
	 * Sets whether to update the body element style initially.
	 * - When true (default), the body element's style is initialized to remove padding and margin, and to apply the background color.
	 * @param update True to update the body element style.
	 * @returns The theme itself, for method chaining.
	 */
	updateBodyStyle(update: boolean): this {
		this._options.updateBodyStyle = update;
		return this;
	}

	/**
	 * Adds a CSS import by URL.
	 * @param url The URL of the CSS style sheet to import.
	 * @returns The theme itself, for method chaining.
	 */
	importCSS(url: string) {
		if (!this._imports) this._imports = [];
		this._imports.push(url);
		return this;
	}

	/**
	 * Creates a copy of this theme's current state.
	 * - Use this to create variations of a theme without modifying the original.
	 * @returns A new {@link WebTheme} with the same configuration.
	 *
	 * @example
	 * const baseTheme = new WebTheme().colors({ accent: "#6200EE" });
	 * const highContrastTheme = baseTheme.cloneTheme().colors({ text: "#000000" });
	 */
	cloneTheme(): WebTheme {
		const copy = Object.create(WebTheme.prototype) as WebTheme;
		copy._buttonStyles = _deepClone(this._buttonStyles);
		copy._textFieldStyles = _deepClone(this._textFieldStyles);
		copy._colors = { ...this._colors };
		copy._darkColors = { ...this._darkColors };
		copy._icons = { ...this._icons };
		copy._darkIcons = { ...this._darkIcons };
		copy._imports = this._imports?.slice();
		copy._options = { ...this._options };
		if (this._options.controlTextStyle) {
			copy._options.controlTextStyle = { ...this._options.controlTextStyle };
		}
		if (this._options.focusDecoration) {
			copy._options.focusDecoration = { ...this._options.focusDecoration };
		}
		return copy;
	}

	/** @internal Returns all theme configuration data as a single object. */
	getThemeData(dark?: boolean): unknown {
		return {
			colors: dark ? { ...this._colors, ...this._darkColors } : this._colors,
			icons: dark ? { ...this._icons, ...this._darkIcons } : this._icons,
			buttonStyles: this._buttonStyles,
			textFieldStyles: this._textFieldStyles,
			imports: [...(this._imports || [])],
			options: { ...this._options },
		};
	}

	/** Color overrides (light mode) */
	private _colors: Record<string, UIColor>;

	/** Dark mode color overrides */
	private _darkColors: Record<string, UIColor>;

	/** Icon overrides (light mode) */
	private _icons: Record<string, UIIconResource>;

	/** Dark mode icon overrides */
	private _darkIcons: Record<string, UIIconResource>;

	/** Button style definitions by variant name */
	private _buttonStyles: Record<string, WebTheme.StyleDefinition>;

	/** Text field style definitions by variant name */
	private _textFieldStyles: Record<string, WebTheme.StyleDefinition>;

	/** CSS imports by URL */
	private _imports?: string[];

	/** Theme options (scalar values that can be shallow-copied) */
	private _options: WebThemeOptions;
}

export namespace WebTheme {
	/**
	 * A type that represents a style definition for themed CSS classes.
	 * - Uses {@link StyleOverrides} from core for base properties.
	 * - Adds state keys: `+hover`, `+focus`, `+pressed`, `+disabled`, `+readonly`.
	 * - Adds CSS selector keys (`:` or `[` prefix).
	 */
	export type StyleDefinition = WebStyleDefinition;
}

/**
 * @internal Apply a variant style to a set of variant style definitions, deep cloning its overrides object.
 */
function _applyVariant(
	styles: Record<string, WebTheme.StyleDefinition>,
	variant: string,
	overrides: WebTheme.StyleDefinition,
) {
	styles[variant] = styles[variant]
		? _deepMergeStyle(styles[variant], overrides)
		: _deepClone(overrides);

	// helper function: deep merge a style definition
	function _deepMergeStyle(
		base: WebTheme.StyleDefinition,
		override: WebTheme.StyleDefinition,
	): WebTheme.StyleDefinition {
		const result: WebTheme.StyleDefinition = _deepClone(base);
		for (const key in override) {
			const baseValue = (result as any)[key];
			const overrideValue = (override as any)[key];
			if (
				(key.startsWith("+") || key.startsWith(":") || key.startsWith("[")) &&
				typeof baseValue === "object" &&
				typeof overrideValue === "object"
			) {
				// Merge nested state/selector properties
				(result as any)[key] = { ...baseValue, ...overrideValue };
			} else {
				(result as any)[key] = overrideValue;
			}
		}
		return result;
	}
}

/** @internal Deep clone an object recursively, except for builtin objects */
function _deepClone<T extends unknown>(value: T): T {
	if (
		value === null ||
		typeof value !== "object" ||
		value instanceof UIColor ||
		value instanceof UIColor.Gradient
	) {
		return value;
	}

	// clone arrays with all elements
	if (Array.isArray(value)) {
		return value.map(_deepClone) as T;
	}

	// clone plain objects
	const result: Record<string, unknown> = {};
	for (const key in value as Record<string, unknown>) {
		result[key] = _deepClone((value as Record<string, unknown>)[key]);
	}
	return result as T;
}
