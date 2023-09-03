import { Binding, strf, StringConvertible } from "../../core/index.js";
import type { UIColor } from "../UIColor.js";
import { UIComponent } from "../UIComponent.js";
import { UIIcon } from "../UIIcon.js";
import { UIStyle } from "../UIStyle.js";
import { UIControl } from "./UIControl.js";

/**
 * A view class that represents a label control
 *
 * @description A label component is rendered on-screen as a stand-alone piece of text.
 *
 * **JSX tag:** `<label>`
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export class UILabel extends UIControl {
	/**
	 * Creates a preset label class with the specified text and style
	 * - The specified text is localized using {@link strf} before being set as {@link UILabel.text}.
	 * @param text The label text
	 * @param style Style definitions to be applied, as an instance of {@link UIStyle} or the name of a dynamic theme style prefixed with the `@` character, **or** an object with {@link UIStyle.Definition.TextStyle} properties
	 * @returns A class that can be used to create instances of this label class with the provided text and style
	 */
	static withText(
		text?: StringConvertible | Binding,
		style?: UIStyle.Definition.TextStyle | UIStyle | `@${string}`,
	) {
		if (typeof text === "string") text = strf(text);
		return style instanceof UIStyle || typeof style === "string"
			? this.with({ text, style })
			: style
			? this.with({ text, textStyle: style })
			: this.with({ text });
	}

	/**
	 * Creates a preset label class with the specified icon
	 * @param icon The label icon
	 * @param size The size of the icon, in pixels or CSS length with unit
	 * @param color The icon foreground color
	 * @returns A class that can be used to create instances of this label class with the specified icon
	 */
	static withIcon(
		icon?: UIIcon | `@${string}` | Binding,
		size?: string | number,
		color?: UIColor | string,
	) {
		return this.with({ icon, iconSize: size, iconColor: color });
	}

	/** Creates a new label view object with the specified text */
	constructor(text?: StringConvertible) {
		super();
		this.style = UIStyle.Label;
		if (text !== undefined) this.text = text;
	}

	override applyViewPreset(
		preset: UIComponent.ViewPreset<
			UIControl,
			this,
			| "headingLevel"
			| "htmlFormat"
			| "text"
			| "icon"
			| "iconSize"
			| "iconMargin"
			| "iconColor"
			| "iconAfter"
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
	icon?: UIIcon | `@${string}`;

	/** Icon size (in pixels or string with unit) */
	iconSize?: string | number;

	/** Margin between the icon and label text (in pixels or string with unit) */
	iconMargin?: string | number;

	/** Icon color (`UIColor` or string) */
	iconColor?: UIColor | string;

	/** True if the icon should appear _after_ the text instead of before */
	iconAfter?: boolean;

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
}

/**
 * A view class that represents a label control with heading level 1
 * - Refer to {@link UILabel} for information on label components.
 * - This class uses the {@link UIStyle.Heading1} style, and sets {@link UILabel.headingLevel} to 1.
 *
 * **JSX tag:** `<h1>`
 */
export class UIHeading1 extends UILabel {
	constructor(text?: StringConvertible) {
		super(text);
		this.style = UIStyle.Heading1;
		this.headingLevel = 1;
	}
}

/**
 * A view class that represents a label control with heading level 2
 * - Refer to {@link UILabel} for information on label components.
 * - This class uses the {@link UIStyle.Heading2} style, and sets {@link UILabel.headingLevel} to 2.
 *
 * **JSX tag:** `<h2>`
 */
export class UIHeading2 extends UILabel {
	constructor(text?: StringConvertible) {
		super(text);
		this.style = UIStyle.Heading2;
		this.headingLevel = 2;
	}
}

/**
 * A view class that represents a label control with heading level 3
 * - Refer to {@link UILabel} for information on label components.
 * - This class uses the {@link UIStyle.Heading3} style, and sets {@link UILabel.headingLevel} to 3.
 *
 * **JSX tag:** `<h3>`
 */
export class UIHeading3 extends UILabel {
	constructor(text?: StringConvertible) {
		super(text);
		this.style = UIStyle.Heading3;
		this.headingLevel = 3;
	}
}

/**
 * A view class that represents a paragraph label control
 * - Refer to {@link UILabel} for information on label components.
 * - This class uses the {@link UIStyle.Paragraph} style.
 * - Text in paragraph labels is wrapped using the `pre-wrap` style.
 *
 * **JSX tag:** `<p>`
 */
export class UIParagraph extends UILabel {
	constructor(text?: StringConvertible) {
		super(text);
		this.style = UIStyle.Paragraph;
	}
}

/**
 * A view class that represents a label control with reduced vertical padding
 * - Refer to {@link UILabel} for information on label components.
 * - This class uses the {@link UIStyle.CloseLabel} style.
 *
 * **JSX tag:** `<closelabel>`
 */
export class UICloseLabel extends UILabel {
	constructor(text?: StringConvertible) {
		super(text);
		this.style = UIStyle.CloseLabel;
	}
}

/**
 * A view class that represents a label control that's expanded as much as possible
 * - Refer to {@link UILabel} for information on label components.
 * - The label is expanded along the primary axis of the containing component; see {@link UIControl.shrinkwrap}.
 *
 * **JSX tag:** `<expandedlabel>`
 */
export class UIExpandedLabel extends UILabel {
	constructor(text?: StringConvertible) {
		super(text);
	}
	override shrinkwrap = false;
}
