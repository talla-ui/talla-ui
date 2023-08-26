import type { UIColor } from "./UIColor.js";
import { UITheme } from "./UITheme.js";

/** Next UID for a `UIStyle` object */
let _nextUID = 1;

/** All style IDs already in use */
const _idsUsed: { [name: string]: true | undefined } = {};

/** Empty style object, to be reused for style objects with no properties */
const _emptyObject = Object.freeze(Object.create(null));

/** Symbol for style reference on `StyleDefinitionObject` */
const $_style = Symbol("style");

/** @internal Structure that contains individual style properties, possibly combined from multiple objects */
class StyleDefinitionObject {
	constructor(style: UIStyle, ...objects: any[]) {
		for (let obj of objects) obj && Object.assign(this, obj);
		this[$_style] = style;
	}
	[$_style]: UIStyle;
	[id: string]: any;
}

/**
 * An object that contains a set of styles that can be applied to a UI component
 *
 * @description
 * Like a CSS class, a UIStyle object can be created once and then applied to any UI component (see {@link UIComponent}) as a whole. Unlike a CSS class, UI components can only be assigned _one_ instance of UIStyle, but styles can be _extended_ to add more style properties — more like an object-oriented model of inheritance than CSS's cascading styles model.
 *
 * New styles are commonly defined by extending the base styles available from the UIStyle class, e.g. `UIStyle.Column` and `UIStyle.Label`. Styles are applied on top of base styles using the {@link UIStyle.extend extend()} method, which creates a _new_ UIStyle instance.
 *
 * To apply a style to a UI component, set its {@link UIComponent.style} property to an instance of UIStyle. This immediately updates individual style objects such as {@link UIComponent.dimensions}, {@link UIComponent.position}, and {@link UIControl.decoration}. Instead of updating the entire style, you can also 'override' styles by setting these objects; refer to {@link UIComponent.style} for an example.
 *
 * @example
 * // Define a style and use it
 * const redLabelStyle = UIStyle.Label.extend({
 *   textStyle: { color: UIColor.Red }
 * });
 * const MyView = UICell.with(
 *   UILabel.with({
 *     style: redLabelStyle,
 *     // ...
 *   })
 * );
 */
export class UIStyle {
	/**
	 * Returns true if the provided object does *not* belong to the {@link UIStyle} instance
	 * @param object The object to check
	 * @param style The {@link UIStyle} instance that may or may not include `object`
	 * */
	static isStyleOverride<K extends keyof UIStyle.Definition>(
		object?: UIStyle.Definition[K],
		style?: UIStyle
	): object is UIStyle.Definition[K] {
		let ownStyle =
			style && style.name[0] === "@" ? style.getBaseStyle() : style;
		return !!(
			object &&
			(!(object instanceof StyleDefinitionObject) ||
				(style && object[$_style] !== ownStyle))
		);
	}

	/**
	 * Creates a new style set with the specified base style and style definition objects
	 * - This constructor is primarily used to create base styles available on {@link UIStyle}; it should not be necessary to create new instances of this class using its constructor.
	 */
	constructor(name = "", base?: UIStyle, styles?: Partial<UIStyle.Definition>) {
		// initialize name and IDs
		this.name = name;
		let id = "S_" + (name ? name.replace(/[^\w\d_\-]/g, "-_") : _nextUID++);
		if (_idsUsed[id]) id += "-" + _nextUID++;
		_idsUsed[id] = true;
		this._id = id;
		this._base = base;
		this._styles = styles || _emptyObject;

		if (name.startsWith("@")) {
			this._dynamic = true;
			let styleName = name.slice(1);
			this.getBaseStyle = () => UITheme.getStyle(styleName);
			this.getIds = () => UITheme.getStyle(styleName).getIds();
			this.getStyles = () => UITheme.getStyle(styleName).getStyles() as any;
			return;
		}

		// if style isn't dynamic (from theme), precompute styles
		if (!base || !base._dynamic) {
			this._combined = this.getStyles();
		}
	}

	/** The name of this style */
	readonly name: string;

	/**
	 * Returns a new {@link UIStyle} object, based on the provided object and new style definitions
	 * @summary This method can be used to create new {@link UIStyle} objects, which include all of the existing styles of another {@link UIStyle} instance. The provided styles are added only to the new instance.
	 * @param name An optional name of the new style
	 * @param styles Additional style definitions, to be added to the new style instance
	 * @param conditional Additional conditional styles (see {@link UIStyle.ConditionalStyles}).
	 * @returns A new {@link UIStyle} object.
	 */
	extend(
		name: string,
		styles?: Partial<UIStyle.Definition>,
		conditional?: UIStyle.ConditionalStyles
	): UIStyle;
	extend(
		styles?: Partial<UIStyle.Definition>,
		conditional?: UIStyle.ConditionalStyles
	): UIStyle;
	// implementation:
	extend(...args: any[]) {
		let name: string =
			typeof args[0] === "string" ? args.shift() : _nextUID++ + "_" + this.name;
		let result = new UIStyle(name, this, args[0]);
		if (args[1]) result._conditional = args[1];
		return result;
	}

	/** Returns the style object that this style is based on, if any */
	getBaseStyle() {
		return this._base;
	}

	/** Returns a list of IDs for all base styles, and this style (last) */
	getIds(): string[] {
		let result = this._base ? this._base.getIds() : [];
		if (this._styles !== _emptyObject) result.push(this._id);
		return result;
	}

	/** Returns the combined definition objects for this style */
	getStyles(): UIStyle.Definition {
		if (this._combined) return this._combined;
		let baseStyles = this._base && this._base.getStyles();
		let styles = this._styles;
		return {
			dimensions: new StyleDefinitionObject(
				this,
				baseStyles && baseStyles.dimensions,
				styles.dimensions
			) as any,
			position: new StyleDefinitionObject(
				this,
				baseStyles && baseStyles.position,
				styles.position
			) as any,
			textStyle: new StyleDefinitionObject(
				this,
				baseStyles && baseStyles.textStyle,
				styles.textStyle
			) as any,
			containerLayout: new StyleDefinitionObject(
				this,
				baseStyles && baseStyles.containerLayout,
				styles.containerLayout
			) as any,
			decoration: new StyleDefinitionObject(
				this,
				baseStyles && baseStyles.decoration,
				styles.decoration
			) as any,
		};
	}

	/** Returns all conditional styles that are defined as part of this style */
	getConditionalStyles(): UIStyle.ConditionalStyles {
		return {
			...this._conditional,
		};
	}

	/** Returns this style's own unique definition objects */
	getOwnStyles(): Readonly<Partial<UIStyle.Definition>> {
		return this._styles;
	}

	/** Returns true if any styles or conditional styles have been set as part of this style object */
	hasStyles() {
		return this._styles !== _emptyObject || this._conditional;
	}

	private _id: string;
	private _base?: UIStyle;
	private _dynamic?: boolean;
	private _styles: Partial<UIStyle.Definition>;
	private _combined?: UIStyle.Definition;
	private _conditional?: UIStyle.ConditionalStyles;
}

export namespace UIStyle {
	// built-in styles, not dynamic:

	/** The built-in container style */
	export const Container = new UIStyle("_container", undefined, {
		containerLayout: {
			gravity: "stretch",
			axis: "vertical",
			distribution: "start",
		},
		position: { gravity: "stretch" },
		dimensions: { grow: 1, shrink: 0 },
	});
	/** The built-in cell style (all centered) */
	export const Cell = Container.extend("_cell", {
		containerLayout: {
			distribution: "center",
			gravity: "center",
			clip: true,
		},
		position: { top: 0 },
	});
	/** The built-in column style (horizontally centered) */
	export const Column = Container.extend("_column", {
		containerLayout: {
			gravity: "center",
		},
		dimensions: { grow: 0, shrink: 0 },
	});
	/** The built-in row style (vertically centered) */
	export const Row = Container.extend("_row", {
		containerLayout: {
			axis: "horizontal",
			gravity: "center",
		},
		dimensions: { grow: 0, shrink: 0 },
	});
	/** The built-in scroll container style (shrink set to 1) */
	export const ScrollContainer = Container.extend("_scroll", {
		containerLayout: { clip: true },
		dimensions: { grow: 1, shrink: 1 },
	});
	/** The built-in spacer style */
	export const Spacer = new UIStyle("_spacer", undefined, {
		dimensions: { grow: 1, width: 8, height: 8 },
		position: { gravity: "stretch" },
	});
	/** The built-in separator style */
	export const Separator = new UIStyle("_separator", undefined, {
		dimensions: { shrink: 0, grow: 0 },
		position: { gravity: "stretch" },
	});

	// other styles, dynamic (from theme):

	/** An instance of {@link UIStyle} that's applied to control elements */
	export const Control = new UIStyle("@Control");
	/** An instance of {@link UIStyle} that's applied to {@link UIButton} instances */
	export const Button = new UIStyle("@Button");
	/** An instance of {@link UIStyle} that's applied to {@link UIBorderlessButton} instances */
	export const BorderlessButton = new UIStyle("@BorderlessButton");
	/** An instance of {@link UIStyle} that's applied to {@link UIPrimaryButton} instances */
	export const PrimaryButton = new UIStyle("@PrimaryButton");
	/** An instance of {@link UIStyle} that's applied to {@link UIOutlineButton} instances */
	export const OutlineButton = new UIStyle("@OutlineButton");
	/** An instance of {@link UIStyle} that's applied to {@link UILinkButton} instances */
	export const LinkButton = new UIStyle("@LinkButton");
	/** An instance of {@link UIStyle} that's applied to {@link UIIconButton} instances */
	export const IconButton = new UIStyle("@IconButton");
	/** An instance of {@link UIStyle} that's applied to {@link UILabel} instances */
	export const Label = new UIStyle("@Label");
	/** An instance of {@link UIStyle} that's applied to {@link UICloseLabel} instances */
	export const CloseLabel = new UIStyle("@CloseLabel");
	/** An instance of {@link UIStyle} that's applied to {@link UIParagraph} instances */
	export const Paragraph = new UIStyle("@Paragraph");
	/** An instance of {@link UIStyle} that's applied to {@link UIHeading1} instances */
	export const Heading1 = new UIStyle("@Heading1");
	/** An instance of {@link UIStyle} that's applied to {@link UIHeading2} instances */
	export const Heading2 = new UIStyle("@Heading2");
	/** An instance of {@link UIStyle} that's applied to {@link UIHeading3} instances */
	export const Heading3 = new UIStyle("@Heading3");
	/** An instance of {@link UIStyle} that's applied to {@link UIImage} instances */
	export const Image = new UIStyle("@Image");
	/** An instance of {@link UIStyle} that's applied to {@link UITextField} instances */
	export const TextField = new UIStyle("@TextField");
	/** An instance of {@link UIStyle} that's applied to {@link UIBorderlessTextField} instances */
	export const BorderlessTextField = new UIStyle("@BorderlessTextField");
	/** An instance of {@link UIStyle} that's applied to {@link UIToggle} instances */
	export const Toggle = new UIStyle("@Toggle");

	/** Type definition for a measurement applied to padding, margin, or border thickness */
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

	/** Type definition for an object containing dynamic conditional styles */
	export type ConditionalStyles = {
		/** Style properties that are applied while a button is pressed */
		pressed?: Partial<UIStyle.Definition>;
		/** Style properties that are applied while the user hovers over a UI element */
		hover?: Partial<UIStyle.Definition>;
		/** Style properties that are applied while a UI element has input focus */
		focused?: Partial<UIStyle.Definition>;
		/** Style properties that are applied while a UI element's input state is disabled */
		disabled?: Partial<UIStyle.Definition>;
		/** Style properties that are applied while a UI element is selected */
		selected?: Partial<UIStyle.Definition>;
	};

	/** Collection of individual objects that represent a (partial) style */
	export type Definition = {
		/** Options for the dimensions of a UI component */
		dimensions: Readonly<Definition.Dimensions>;
		/** Options for component positioning within parent component(s) */
		position: Readonly<Definition.Position>;
		/** Options for styles of a UI component that shows text */
		textStyle: Readonly<Definition.TextStyle>;
		/** Options for the appearance of UI components, including miscellaneous CSS attributes and class names */
		decoration: Readonly<Definition.Decoration>;
		/** Options for layout of child components of a container component */
		containerLayout: Readonly<Definition.ContainerLayout>;
	};

	export namespace Definition {
		/** Options for the dimensions of a UI component */
		export type Dimensions = {
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
			/** Growth quotient (0 for no growth, higher values for faster growth when needed) */
			grow?: number;
			/** Shrink quotient (0 to never shrink, higher values for faster shrinking when needed) */
			shrink?: number;
		};

		/** Options for component positioning within parent component(s) */
		export type Position = {
			/** Position of the component in the direction perpendicular to the distribution axis of the parent component, or `overlay` if the component should be placed on top of other components (i.e. CSS absolute positioning) */
			gravity?:
				| "start"
				| "end"
				| "center"
				| "stretch"
				| "baseline"
				| "overlay"
				| "cover"
				| "";
			/** Top anchor: relative distance, or absolute position if `gravity` is 'overlay' (in pixels or string with unit, defaults to `auto`) */
			top?: string | number;
			/** Bottom anchor: relative distance, or absolute position if `gravity` is 'overlay' (in pixels or string with unit, defaults to `auto`) */
			bottom?: string | number;
			/** Left anchor: relative distance, or absolute position if `gravity` is 'overlay' (in pixels or string with unit, defaults to `auto`), same as `start` for LTR text direction */
			left?: string | number;
			/** Right anchor: relative distance, or absolute position if `gravity` is 'overlay' (in pixels or string with unit, defaults to `auto`), same as `end` for LTR text direction */
			right?: string | number;
			/** Start anchor: relative distance, or absolute position if `gravity` is 'overlay' (in pixels or string with unit, defaults to `auto`), same as `left` for LTR text direction */
			start?: string | number;
			/** End anchor: relative distance, or absolute position if `gravity` is 'overlay' (in pixels or string with unit, defaults to `auto`), same as `right` for LTR text direction */
			end?: string | number;
		};

		/** Options for styles of a UI component that shows text */
		export type TextStyle = {
			/** Text direction (rtl or ltr) */
			direction?: "rtl" | "ltr";
			/** Text alignment (CSS) */
			align?: string;
			/** Text color (`UIColor` or string) */
			color?: UIColor | string;
			/** Font family (CSS) */
			fontFamily?: string;
			/** Font size (pixels or string with unit) */
			fontSize?: string | number;
			/** Font weight (CSS) */
			fontWeight?: string | number;
			/** Letter spacing (pixels or string with unit) */
			letterSpacing?: string | number;
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
		};

		/** Options for the appearance of UI components, including miscellaneous CSS attributes and class names */
		export type Decoration = {
			/** Background style or color (`UIColor` or string) */
			background?: UIColor | string;
			/** Text color (`UIColor` or string); this may be overridden by `UIStyle.Definition.TextStyle.color` if specified on the same component or a child component */
			textColor?: UIColor | string;
			/** Border color (`UIColor` or string) */
			borderColor?: UIColor | string;
			/** Border style (CSS), defaults to "solid" */
			borderStyle?: string;
			/** Border thickness (in pixels or CSS string, or separate offset values) */
			borderThickness?: Offsets;
			/** Border radius (in pixels or CSS string) */
			borderRadius?: string | number;
			/** Padding within control element (in pixels or CSS string, or separate offset values) */
			padding?: Offsets;
			/** Drop shadow elevation level (0–1) */
			dropShadow?: number;
			/** Opacity (0-1) */
			opacity?: number;
			/** Miscellaneous CSS attributes */
			css?: Partial<CSSStyleDeclaration>;
			/** Miscellaneous CSS class names (array) */
			cssClassNames?: string[];
		};

		/** Options for layout of child components of a container component (only exists on `UIContainer` instances) */
		export type ContainerLayout = {
			/** Axis along which content is distributed (defaults to vertical) */
			axis?: "horizontal" | "vertical" | "";
			/** Positioning of content along the distribution axis (defaults to start) */
			distribution?: "start" | "end" | "center" | "fill" | "space-around" | "";
			/** Positioning of content perpendicular to the distribution axis (defaults to stretch) */
			gravity?: "start" | "end" | "center" | "stretch" | "baseline" | "";
			/** True if content should wrap to new line/column if needed (defaults to false) */
			wrapContent?: boolean;
			/** True if content should be clipped within this container */
			clip?: boolean;
			/** Options for separator between each component */
			separator?: Readonly<SeparatorOptions>;
		};

		/** Options for the appearance of container separators */
		export type SeparatorOptions = {
			/** True for vertical line, or width-only spacer */
			vertical?: boolean;
			/** Width/height of separator space (CSS length or pixels) */
			space?: string | number;
			/** Separator line thickness (CSS length or pixels) */
			lineThickness?: string | number;
			/** Line separator color (`UIColor` or string), defaults to `@separator` */
			lineColor?: UIColor | string;
			/** Line separator margin (CSS length or pixels) */
			lineMargin?: string | number;
		};
	}
}
