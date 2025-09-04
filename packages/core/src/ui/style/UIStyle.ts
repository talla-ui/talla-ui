import type { UIColor } from "./index.js";

// Default values for style defaults
const DEFAULT_GAP = 8;
const DEFAULT_ICON_SIZE = 20;

/** Next 'random' ID assigned if style definition doesn't specify one */
let _nextStyleId = 0x1234;

/**
 * A class that represents a collection of styles that can be applied to UI elements
 *
 * @description
 * The UIStyle class manages style definitions that can be applied to UI elements. Style properties are defined as objects, with each property representing a style value (e.g. text color, font family, padding, etc.).
 *
 * Multiple objects can be combined to create a list of style definitions, which can be applied to UI elements based on their state (e.g. hovered, pressed, focused, etc.).
 *
 * Each instance contains a set of style definitions, optionally based on a dynamic theme reference, as well as an 'overrides' object. When applied to a UI element, styles are defined as needed and overrides are applied directly.
 *
 * To create a new instance, use the `new UIStyle(...)` constructor. To extend an existing style, use the {@link extend()} method, e.g. `UI.styles.button.primary.extend(...)`.
 */
export class UIStyle {
	/**
	 * Creates a {@link UIStyle} instance that dynamically resolves to another instance
	 * - This method is used to create a theme style reference by {@link UIStyle.theme}.
	 * @param f A function that returns the instance to resolve to, or undefined
	 * @returns A new {@link UIStyle} instance that will resolve the factory function when applied
	 * @see {@link UIStyle.theme}
	 */
	static resolve(f: () => UIStyle | undefined): UIStyle {
		let result = new UIStyle();
		result._resolve = f;
		return result;
	}

	/**
	 * Creates a new style instance with the specified style definitions
	 * @param styles Style definition(s) to apply
	 */
	constructor(...styles: Readonly<UIStyle.StyleOptions>[]) {
		this._id = "S_" + _nextStyleId++;
		this._styles = styles;
	}

	/**
	 * Returns an identifier for this style definition
	 * - This is used to cache style definitions based on the preset, and is different for styles that are extended with additional style definitions
	 */
	get id() {
		return this._id;
	}

	/**
	 * Adds conditional styles for disabled elements
	 * - Disabled styles are applied to all disabled elements, regardless of other states (hovered, pressed, focused, readonly).
	 * @note This method modifies the current style instance, and returns it for chaining. To create a new style with disabled styles, use {@link extend()} first.
	 * @param styles Style properties to apply to disabled elements
	 * @returns The current style instance, for chaining
	 */
	setDisabled(styles: Readonly<UIStyle.StyleOptions>): UIStyle {
		return this._setConditional({ state: { disabled: true } }, styles);
	}

	/**
	 * Adds conditional styles for hovered elements
	 * - Hovered styles are not applied to disabled or focused elements.
	 * @note This method modifies the current style instance, and returns it for chaining. To create a new style with disabled styles, use {@link extend()} first.
	 * @param styles Style properties to apply to disabled elements
	 * @returns The current style instance, for chaining
	 */
	setHovered(styles: Readonly<UIStyle.StyleOptions>): UIStyle {
		return this._setConditional(
			{ state: { hovered: true, disabled: false, focused: false } },
			styles,
		);
	}

	/**
	 * Adds conditional styles for focused elements
	 * - Focused styles are not applied to disabled elements.
	 * @note This method modifies the current style instance, and returns it for chaining. To create a new style with focused styles, use {@link extend()} first.
	 * @param styles Style properties to apply to focused elements
	 * @returns The current style instance, for chaining
	 */
	setFocused(styles: Readonly<UIStyle.StyleOptions>): UIStyle {
		return this._setConditional(
			{ state: { focused: true, disabled: false } },
			styles,
		);
	}

	/**
	 * Adds conditional styles for pressed (button) elements
	 * - Pressed styles are not applied to disabled elements.
	 * - Hovered styles are not applied to focused elements.
	 * @note This method modifies the current style instance, and returns it for chaining. To create a new style with pressed styles, use {@link extend()} first.
	 * @param styles Style properties to apply to pressed elements
	 * @param pressedHovered Style properties to apply to pressed and hovered (unfocused) elements
	 * @param pressedFocused Style properties to apply to pressed and focused elements; defaults to hovered styles
	 * @returns The current style instance, for chaining
	 */
	setPressed(
		styles: Readonly<UIStyle.StyleOptions>,
		pressedHovered: Readonly<UIStyle.StyleOptions> = {},
		pressedFocused: Readonly<UIStyle.StyleOptions> = pressedHovered,
	): UIStyle {
		return this._setConditional(
			{ state: { pressed: true, disabled: false } },
			styles,
		)
			._setConditional(
				{
					state: {
						pressed: true,
						hovered: true,
						disabled: false,
						focused: false,
					},
				},
				pressedHovered,
			)
			._setConditional(
				{ state: { pressed: true, focused: true, disabled: false } },
				pressedFocused,
			);
	}

	/**
	 * Adds conditional styles for readonly elements
	 * - Readonly styles are not applied to disabled elements.
	 * - Hovered styles are not applied to focused elements.
	 * @note This method modifies the current style instance, and returns it for chaining. To create a new style with pressed styles, use {@link extend()} first.
	 * @param styles Style properties to apply to readonly elements
	 * @param readonlyHovered Style properties to apply to readonly and hovered (unfocused) elements
	 * @param readonlyFocused Style properties to apply to readonly and focused elements; defaults to hovered styles
	 * @returns The current style instance, for chaining
	 */
	setReadonly(
		styles: Readonly<UIStyle.StyleOptions>,
		readonlyHovered: Readonly<UIStyle.StyleOptions> = {},
		readonlyFocused: Readonly<UIStyle.StyleOptions> = readonlyHovered,
	): UIStyle {
		return this._setConditional(
			{ state: { readonly: true, disabled: false } },
			styles,
		)
			._setConditional(
				{
					state: {
						readonly: true,
						hovered: true,
						disabled: false,
						focused: false,
					},
				},
				readonlyHovered,
			)
			._setConditional(
				{ state: { readonly: true, focused: true, disabled: false } },
				readonlyFocused,
			);
	}

	/**
	 * Creates a new style that extends the current style
	 * @param styles Additional style properties to apply on top of the current style
	 * @returns A new {@link UIStyle} instance
	 */
	extend(...styles: Readonly<UIStyle.StyleOptions>[]): UIStyle {
		let result = new UIStyle();
		result._styles = this._styles.concat(styles);
		result._id = this._id + "_" + result.id.slice(2);
		result._resolve = this._resolve;
		return result;
	}

	/**
	 * Creates a new style that copies from this style, with additional overrides
	 * @note Overrides are applied directly to a UI element, and are not cached. To create a new style that is widely reused, use {@link extend()} instead.
	 * @param styles Style definition objects containing values to override
	 * @returns A new {@link UIStyle} instance
	 */
	override(...styles: Readonly<UIStyle.StyleOptions | undefined>[]): UIStyle {
		let result = new UIStyle();
		result._styles = this._styles;
		result._id = this._id;
		result._resolve = this._resolve;
		result._overrides = Object.assign({ ...this._overrides }, ...styles);
		return result;
	}

	/**
	 * Returns the complete list of style definitions for this style (but not overrides)
	 * @returns A read-only array of style definitions
	 */
	getStyles(): ReadonlyArray<UIStyle.StyleDefinition> {
		let baseStyle = this._resolve?.();
		if (baseStyle) {
			return [...baseStyle.getStyles(), ...this._styles];
		}
		return this._styles;
	}

	/**
	 * Returns any style overrides for this style, which should be applied directly to a UI element
	 * @returns An object containing style overrides, if any
	 */
	getOverrides(): Readonly<UIStyle.StyleOptions> | undefined {
		return this._overrides;
	}

	/** Implementation of methods to apply conditional styles */
	private _setConditional(
		state: UIStyle.StyleDefinition,
		styles: Readonly<UIStyle.StyleOptions>,
	): UIStyle {
		this._styles = [...this._styles, { ...state, ...styles }];
		return this;
	}

	/** Style definition ID with serial number */
	private _id = "S_";

	/** Theme style getter, if this style is based on a theme style */
	private _resolve?: () => UIStyle | undefined;

	/** List of style definitions, if any */
	private _styles: ReadonlyArray<UIStyle.StyleDefinition>;

	/** Element overrides, if any */
	private _overrides?: Readonly<UIStyle.StyleOptions>;
}

export namespace UIStyle {
	/**
	 * Type definition for styles, including flags for state conditions
	 * - This type of object is returned by the {@link UIStyle.getStyles()} method, and is used to create new style instances with various state conditions.
	 * @see {@link UIStyle.getStyles()}
	 */
	export type StyleDefinition = Readonly<
		UIStyle.StyleOptions & {
			state?: {
				hovered?: boolean;
				pressed?: boolean;
				focused?: boolean;
				readonly?: boolean;
				disabled?: boolean;
			};
		}
	>;

	/** Type definition for a measurement applied to padding, margin, or border width */
	export type Offsets =
		| string
		| number
		| {
				x?: string | number;
				y?: string | number;
				top?: string | number;
				bottom?: string | number;
				left?: string | number;
				right?: string | number;
				start?: string | number;
				end?: string | number;
		  };

	/**
	 * Style options that can be applied to an element: dimensions, decoration, and typography
	 * @see {@link UIStyle}
	 */
	export type StyleOptions = {
		/** Outer width of the element, as specified (in pixels or string with unit) */
		width?: string | number;
		/** Outer height of the element, as specified (in pixels or string with unit) */
		height?: string | number;
		/** Minimum width of the element, as specified (in pixels or string with unit) */
		minWidth?: string | number;
		/** Maximum width of the element, as specified (in pixels or string with unit) */
		maxWidth?: string | number;
		/** Minimum height of the element, as specified (in pixels or string with unit) */
		minHeight?: string | number;
		/** Maximum height of the element, as specified (in pixels or string with unit) */
		maxHeight?: string | number;
		/** Growth factor (0 or false for no growth, higher values for faster growth when needed; true = 1) */
		grow?: number | boolean;
		/** Shrink factor (0 or false to never shrink, higher values for faster shrinking when needed; true = 1) */
		shrink?: number | boolean;
		/** Padding within control element (in pixels or CSS string, or separate offset values) */
		padding?: Offsets;
		/** Margin around control element (in pixels or CSS string, or separate offset values) */
		margin?: Offsets;
		/** Opacity (0-1) */
		opacity?: number;
		/** Text direction (rtl or ltr) */
		textDirection?: "rtl" | "ltr";
		/** Text alignment (CSS) */
		textAlign?: string;
		/** Font family (CSS) */
		fontFamily?: string;
		/** Font size (pixels or string with unit) */
		fontSize?: string | number;
		/** Font weight (CSS) */
		fontWeight?: string | number;
		/** Letter spacing (pixels or string with unit) */
		letterSpacing?: string | number;
		/** True for monospaced (tabular) numeric characters */
		tabularNums?: boolean;
		/** Line height (CSS relative to font size, *not* in pixels) */
		lineHeight?: string | number;
		/** Line break handling mode (CSS white-space) */
		lineBreakMode?:
			| "normal"
			| "nowrap"
			| "pre"
			| "pre-wrap"
			| "pre-line"
			| "ellipsis"
			| "clip"
			| "";
		/** True for bold text (overrides `fontWeight` value) */
		bold?: boolean;
		/** True for italic text */
		italic?: boolean;
		/** True for all-uppercase text */
		uppercase?: boolean;
		/** True for text using small caps */
		smallCaps?: boolean;
		/** True for underlined text */
		underline?: boolean;
		/** True for struck trough text */
		strikeThrough?: boolean;
		/** True if text can be selected by the user */
		userTextSelect?: boolean;
		/** Background style or color */
		background?: UIColor | string;
		/** Text color */
		textColor?: UIColor;
		/** Border color */
		borderColor?:
			| UIColor
			| {
					top?: UIColor;
					bottom?: UIColor;
					left?: UIColor;
					right?: UIColor;
					start?: UIColor;
					end?: UIColor;
			  };
		/** Border style (CSS), defaults to "solid" */
		borderStyle?: string;
		/** Border width (in pixels or CSS string, or separate offset values) */
		borderWidth?: Offsets;
		/** Border radius (in pixels or CSS string) */
		borderRadius?:
			| string
			| number
			| {
					topLeft?: string | number;
					topRight?: string | number;
					bottomLeft?: string | number;
					bottomRight?: string | number;
					topStart?: string | number;
					bottomStart?: string | number;
					topEnd?: string | number;
					bottomEnd?: string | number;
			  };
		/** Drop shadow height (in pixels, approximate blur distance; negative values for inset shadows) */
		dropShadow?: number;
		/** Cursor style (same values as CSS, if supported) */
		cursor?: string;
		/** Miscellaneous CSS attributes */
		css?: Partial<CSSStyleDeclaration>;
	};

	/**
	 * A common class that manages theme-based resolution for colors, icons, animations, and styles
	 *
	 * @description
	 * The ThemeResolver class provides a way to define and resolve theme-based values by name. It manages a collection of values (for colors, icons, animations, and styles) that can be referenced by string keys, with lazy resolution and caching.
	 *
	 * This class is used for theme values stored in {@link UIColor.theme}, {@link UIStyle.theme}, {@link UIIconResource.theme}, and {@link UIAnimation.theme}, and provides the logic to resolve theme dynamically from the global {@link UI} object.
	 *
	 * @docgen {hideconstructor}
	 */
	export class ThemeResolver<T, K extends string> {
		/**
		 * Creates a new theme resolver
		 * @param keys Array of available theme keys (e.g. "primary", "danger", "success")
		 * @param resolver Function to create resolved instances from factory functions
		 * @param invalidate Optional callback to invalidate cached values when new values are applied
		 */
		constructor(
			keys: K[],
			resolver: (f: () => T | undefined) => T,
			invalidate?: () => void,
		) {
			this._resolver = resolver;
			this._invalidate = invalidate;
			this._theme = {} as Record<K, T | undefined>;
			for (let k of keys) this._theme[k] = undefined;
		}

		/**
		 * Sets theme values from the specified object
		 * @note If any new keys are added, calling the {@link refs()} method will result in an object that also includes the new keys.
		 * @param values Object containing theme values to set, indexed by key (name)
		 * @returns The resolver instance, typed to include any new keys
		 */
		set<L extends string>(values: Partial<Record<K, T>> & { [k in L]: T }) {
			this._theme = { ...this._theme, ...values };
			this._invalidate?.();
			return this as ThemeResolver<T, K | L>;
		}

		/**
		 * Constructs a theme reference for the specified key to resolve
		 * @note This method can be used to reference a theme value dynamically; however from an application, using the global {@link UI} object is preferred.
		 * @param id The theme key to reference
		 * @returns A reference created by the resolver for this object
		 */
		ref(id: K): T {
			return (this._ref[id] ??= this._resolver(() => this._theme[id]));
		}

		/**
		 * Gets instances for all theme values that can be resolved
		 * @note This method is used to create the objects referenced by the global {@link UI} object. You can create your own theme objects using this method, after applying new theme values.
		 * @returns An object containing instances, indexed by key (e.g. color or icon name)
		 */
		refs(): Readonly<Record<K, T>> {
			let result = {} as Record<K, T>;
			for (let k in this._theme) {
				result[k] = this.ref(k);
			}
			return result;
		}

		private _resolver: (f: () => T | undefined) => T;
		private _invalidate?: () => void;
		private _ref: Partial<Record<K, T>> = {};
		private _theme: Record<K, T | undefined>;
	}

	/**
	 * A collection of theme resolvers for different control styles
	 *
	 * @description
	 * This object provides access to predefined style themes for various control elements. Each resolver manages a set of named styles that are referenced by string keys, e.g. from the `buttonStyle(...)` method on a button builder.
	 *
	 * To update these styles, use the {@link UIStyle.ThemeResolver.set set()} method on the resolver, and then remount all views using the `app.remount()` method.
	 *
	 * @see {@link UIColor.theme}
	 * @see {@link UIIconResource.theme}
	 * @see {@link UIAnimation.theme}
	 */
	export const theme = Object.freeze({
		label: new ThemeResolver(
			[
				"default",
				"title",
				"large",
				"headline",
				"bold",
				"italic",
				"secondary",
				"small",
				"badge",
				"successBadge",
				"dangerBadge",
				"toggleLabel",
			],
			UIStyle.resolve,
		),
		button: new ThemeResolver(
			[
				"default",
				"primary",
				"success",
				"danger",
				"plain",
				"toggle",
				"text",
				"link",
				"small",
				"icon",
				"toggleIcon",
				"primaryIcon",
				"successIcon",
				"dangerIcon",
				"iconTop",
				"iconTopStart",
				"iconTopEnd",
			],
			UIStyle.resolve,
		),
		textfield: new ThemeResolver(["default", "transparent"], UIStyle.resolve),
		toggle: new ThemeResolver(
			["default", "danger", "success"],
			UIStyle.resolve,
		),
		image: new ThemeResolver(["default"], UIStyle.resolve),
		divider: new ThemeResolver(
			["default", "dashed", "dotted"],
			UIStyle.resolve,
		),
	});

	/**
	 * Default configuration options for UI styling
	 * - These options are applied dynamically when rendering UI containers and controls, and can be updated by setting these values.
	 * - After changing any of these values, you must remount all views using the `app.remount()` method.
	 */
	export let defaultOptions = {
		/** Default (row) gap size in pixels */
		gap: DEFAULT_GAP,
		/** Default icon size in pixels */
		iconSize: DEFAULT_ICON_SIZE,
	};
}
