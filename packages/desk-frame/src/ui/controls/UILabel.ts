import { Binding, strf, StringConvertible } from "../../core/index.js";
import type { UIColor } from "../UIColor.js";
import { UIComponent } from "../UIComponent.js";
import { UIIconResource } from "../UIIconResource.js";
import { UITheme } from "../UITheme.js";

/**
 * A view class that represents a label control
 *
 * @description A label component is rendered on-screen as a stand-alone piece of text.
 *
 * **JSX tag:** `<label>`
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export class UILabel extends UIComponent {
	/**
	 * Creates a preset label class with the specified text and style
	 * - The specified text is localized using {@link strf} before being set as {@link UILabel.text}.
	 * @param text The label text
	 * @param labelStyle The label style (optional)
	 * @returns A class that can be used to create instances of this label class with the provided text and style
	 */
	static withText(
		text?: StringConvertible | Binding,
		labelStyle?: UITheme.StyleConfiguration<UILabelStyle>,
	) {
		if (typeof text === "string") text = strf(text);
		return this.with({ text, labelStyle });
	}

	/**
	 * Creates a preset label class with the specified icon
	 * @param icon The label icon
	 * @param size The size of the icon, in pixels or CSS length with unit
	 * @param color The icon foreground color
	 * @returns A class that can be used to create instances of this label class with the specified icon
	 */
	static withIcon(
		icon?: UIIconResource | `@${string}` | Binding,
		size?: string | number,
		color?: UIColor | string,
	) {
		return this.with({ icon, iconSize: size, iconColor: color });
	}

	/** Creates a new label view object with the specified text */
	constructor(text?: StringConvertible) {
		super();
		this.text = text;
	}

	override applyViewPreset(
		preset: UIComponent.ViewPreset<
			UIComponent,
			this,
			| "headingLevel"
			| "htmlFormat"
			| "text"
			| "icon"
			| "iconSize"
			| "iconMargin"
			| "iconColor"
			| "width"
			| "bold"
			| "italic"
			| "color"
			| "labelStyle"
		> & {
			/** True if this label may receive input focus */
			allowFocus?: boolean;
			/** True if this label may receive input focus using the keyboard; implies `allowFocus` */
			allowKeyboardFocus?: boolean;
		},
	) {
		if (preset.allowKeyboardFocus) preset.allowFocus = true;

		super.applyViewPreset(preset);
	}

	/** The label text to be displayed */
	text?: StringConvertible;

	/** The label icon to be displayed */
	icon?: UIIconResource | `@${string}` = undefined;

	/** Icon size (in pixels or string with unit) */
	iconSize?: string | number;

	/** Space between the icon and label text (in pixels or string with unit) */
	iconMargin?: string | number;

	/** Icon color (`UIColor` or string) */
	iconColor?: UIColor | string;

	/**
	 * Text heading level
	 * - Heading level 1 refers to the most prominent heading, i.e. `<h1>` HTML element.
	 * - This property can't be changed after rendering.
	 */
	headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;

	/** True if text should be rendered as HTML instead of plain text */
	htmlFormat?: boolean;

	/**
	 * True if this label may receive input focus
	 * - This property isn't observed, and can't be changed after rendering.
	 */
	allowFocus?: boolean;

	/**
	 * True if this label may receive input focus using the keyboard (e.g. Tab key)
	 * - This property isn't observed, and can't be changed after rendering.
	 * - If this property is set to true, allowFocus is assumed to be true as well and no longer checked.
	 */
	allowKeyboardFocus?: boolean;

	/** Target width of the label, in pixels or CSS length with unit */
	width?: string | number = undefined;

	/**
	 * True if this label should be displayed using bold text
	 * - If set, this property overrides the `bold` property of the current label style.
	 */
	bold?: boolean = undefined;

	/**
	 * True if this label should be displayed using bold text
	 * - If set, this property overrides the `italic` property of the current label style.
	 */
	italic?: boolean = undefined;

	/**
	 * The text color to be applied to this label
	 * - If set, this property overrides the `textColor` property of the current label style.
	 */
	color?: UIColor | string = undefined;

	/** The style to be applied to this label */
	labelStyle: UITheme.StyleConfiguration<UILabelStyle> = undefined;
}

/**
 * A style class that includes default style properties for instances of {@link UILabel}
 * - Default styles are taken from {@link UITheme}.
 * - Extend or override this class to implement custom label styles, see {@link UITheme.BaseStyle} for details.
 */
export class UILabelStyle extends UITheme.BaseStyle<
	"Label",
	UIComponent.DimensionsStyleType &
		UIComponent.DecorationStyleType &
		UIComponent.TextStyleType
> {
	constructor() {
		super("Label", UILabelStyle);
	}
}

/**
 * A view class that represents a label control with heading level 1
 * - Refer to {@link UILabel} for information on label components.
 * - This class uses the {@link UIHeading1LabelStyle} style, and sets {@link UILabel.headingLevel} to 1.
 *
 * **JSX tag:** `<h1>`
 */
export class UIHeading1Label extends UILabel {
	constructor(text?: StringConvertible) {
		super(text);
		this.headingLevel = 1;
		this.labelStyle = UIHeading1LabelStyle;
	}
}

/**
 * A style class that includes default style properties for instances of {@link UIHeading1Label}
 * - Default styles are taken from {@link UITheme}.
 * - Extend or override this class to implement custom heading styles, see {@link UITheme.BaseStyle} for details.
 */
export class UIHeading1LabelStyle extends UITheme.BaseStyle<
	"Heading1Label",
	UIComponent.DimensionsStyleType &
		UIComponent.DecorationStyleType &
		UIComponent.TextStyleType
> {
	constructor() {
		super("Heading1Label", UIHeading1LabelStyle);
	}
}

/**
 * A view class that represents a label control with heading level 2
 * - Refer to {@link UILabel} for information on label components.
 * - This class uses the {@link UIHeading2LabelStyle} style, and sets {@link UILabel.headingLevel} to 2.
 *
 * **JSX tag:** `<h2>`
 */
export class UIHeading2Label extends UILabel {
	constructor(text?: StringConvertible) {
		super(text);
		this.headingLevel = 2;
		this.labelStyle = UIHeading2LabelStyle;
	}
}

/**
 * A style class that includes default style properties for instances of {@link UIHeading2Label}
 * - Default styles are taken from {@link UITheme}.
 * - Extend or override this class to implement custom heading styles, see {@link UITheme.BaseStyle} for details.
 */
export class UIHeading2LabelStyle extends UITheme.BaseStyle<
	"Heading2Label",
	UIComponent.DimensionsStyleType &
		UIComponent.DecorationStyleType &
		UIComponent.TextStyleType
> {
	constructor() {
		super("Heading2Label", UIHeading2LabelStyle);
	}
}

/**
 * A view class that represents a label control with heading level 3
 * - Refer to {@link UILabel} for information on label components.
 * - This class uses the {@link UIHeading3LabelStyle} style, and sets {@link UILabel.headingLevel} to 3.
 *
 * **JSX tag:** `<h3>`
 */
export class UIHeading3Label extends UILabel {
	constructor(text?: StringConvertible) {
		super(text);
		this.headingLevel = 3;
		this.labelStyle = UIHeading3LabelStyle;
	}
}

/**
 * A style class that includes default style properties for instances of {@link UIHeading3Label}
 * - Default styles are taken from {@link UITheme}.
 * - Extend or override this class to implement custom heading styles, see {@link UITheme.BaseStyle} for details.
 */
export class UIHeading3LabelStyle extends UITheme.BaseStyle<
	"Heading3Label",
	UIComponent.DimensionsStyleType &
		UIComponent.DecorationStyleType &
		UIComponent.TextStyleType
> {
	constructor() {
		super("Heading3Label", UIHeading3LabelStyle);
	}
}

/**
 * A view class that represents a paragraph label control
 * - Refer to {@link UILabel} for information on label components.
 * - This class uses the {@link UIParagraphLabelStyle} style, which applies the `pre-wrap` style by default.
 *
 * **JSX tag:** `<p>`
 */
export class UIParagraphLabel extends UILabel {
	constructor(text?: StringConvertible) {
		super(text);
		this.labelStyle = UIParagraphLabelStyle;
	}
}

/**
 * A style class that includes default style properties for instances of {@link UIParagraphLabel}
 * - Default styles are taken from {@link UITheme}.
 * - Extend or override this class to implement custom paragraph label styles, see {@link UITheme.BaseStyle} for details.
 */
export class UIParagraphLabelStyle extends UITheme.BaseStyle<
	"ParagraphLabel",
	UIComponent.DimensionsStyleType &
		UIComponent.DecorationStyleType &
		UIComponent.TextStyleType
> {
	constructor() {
		super("ParagraphLabel", UIParagraphLabelStyle);
	}
}

/**
 * A view class that represents a label control with reduced vertical padding
 * - Refer to {@link UILabel} for information on label components.
 * - This class uses the {@link UICloseLabelStyle} style, which removes all vertical padding by default.
 *
 * **JSX tag:** `<closelabel>`
 */
export class UICloseLabel extends UILabel {
	constructor(text?: StringConvertible) {
		super(text);
		this.labelStyle = UICloseLabelStyle;
	}
}

/**
 * A style class that includes default style properties for instances of {@link UICloseLabel}
 * - Default styles are taken from {@link UITheme}.
 * - Extend or override this class to implement custom close label styles, see {@link UITheme.BaseStyle} for details.
 */
export class UICloseLabelStyle extends UITheme.BaseStyle<
	"CloseLabel",
	UIComponent.DimensionsStyleType &
		UIComponent.DecorationStyleType &
		UIComponent.TextStyleType
> {
	constructor() {
		super("CloseLabel", UICloseLabelStyle);
	}
}
