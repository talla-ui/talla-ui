import { Binding, strf, StringConvertible } from "../../base/index.js";
import { NavigationTarget } from "../../app/index.js";
import { UIColor } from "../UIColor.js";
import { UIIconResource } from "../UIIconResource.js";
import { UIComponent } from "../UIComponent.js";
import { UITheme } from "../UITheme.js";

/**
 * A view class that represents a button control
 *
 * @description A button component is rendered on-screen as a button control.
 *
 * **JSX tag:** `<button>`
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export class UIButton extends UIComponent {
	/**
	 * Creates a preset button class with the specified label and click event
	 * - The specified label is localized using {@link strf} before being set as {@link UIButton.label}.
	 * @param label The button label
	 * @param onClick The name of the event to be emitted instead of (or in addition to, if starting with `+`) the Click event
	 * @param buttonStyle The button style (optional)
	 * @returns A class that can be used to create instances of this button class with the provided label and click event handler
	 */
	static withLabel(
		label?: StringConvertible | Binding,
		onClick?: string,
		buttonStyle?: UITheme.StyleConfiguration<UIButtonStyle>,
	) {
		if (typeof label === "string") label = strf(label);
		return this.with({ label, onClick, buttonStyle });
	}

	/**
	 * Creates a preset button class with the specified icon and click event
	 * @param icon The button icon
	 * @param onClick The name of the event to be emitted instead of (or in addition to, if starting with `+`) the Click event
	 * @param size The size of the icon, in pixels or CSS length with unit
	 * @param color The icon foreground color
	 * @returns A class that can be used to create instances of this button class with the provided icon and click event handler
	 */
	static withIcon(
		icon: UIIconResource | `@${string}` | Binding,
		onClick?: string,
		size?: string | number,
		color?: UIColor | string,
	) {
		return this.with({ icon, iconSize: size, iconColor: color, onClick });
	}

	/** Creates a new button view object with the specified label */
	constructor(label?: StringConvertible) {
		super();
		this.label = label;
	}

	/**
	 * Applies the provided preset properties to this object
	 * - This method is called automatically. Do not call this method after constructing a UI component.
	 */
	override applyViewPreset(
		preset: UIComponent.ViewPreset<
			UIComponent,
			this,
			| "label"
			| "icon"
			| "iconSize"
			| "iconMargin"
			| "iconColor"
			| "chevron"
			| "chevronSize"
			| "navigateTo"
			| "disabled"
			| "width"
			| "pressed"
			| "value"
			| "buttonStyle"
		> & {
			/** True if keyboard focus should be disabled this button */
			disableKeyboardFocus?: boolean | Binding<boolean>;
		},
	) {
		// quietly change 'text' to label to support JSX tag content
		if ("text" in (preset as any)) {
			preset.label = (preset as any).text;
			delete (preset as any).text;
		}

		// use a 'link' role automatically if navigation target is specified
		if (preset.navigateTo && !preset.accessibleRole) {
			preset.accessibleRole = "link";
		}

		super.applyViewPreset(preset);
	}

	/** The button label to be displayed */
	label?: StringConvertible;

	/** The button icon to be displayed */
	icon?: UIIconResource | `@${string}` = undefined;

	/** Icon size (in pixels or string with unit) */
	iconSize?: string | number;

	/** Space between icon and label text (in pixels or string with unit) */
	iconMargin?: string | number;

	/** Icon color */
	iconColor?: UIColor | string;

	/** Direction of chevron icon to be placed at the far end of the button, if any */
	chevron?: "up" | "down" | "next" | "back" = undefined;

	/** Chevron icon size (in pixels or string with unit) */
	chevronSize?: string | number;

	/**
	 * Path or navigation target to navigate to when this button is clicked
	 * - Set this property to `:back` to go navigate back in the location history stack.
	 */
	navigateTo?: StringConvertible | NavigationTarget;

	/**
	 * The current visual selection state
	 * - This property is not set automatically. It can be set manually, or bound using {@link Binding.match()} to select and deselect the button based on the current value of a property.
	 */
	pressed = false;

	/**
	 * An option value that this button represents, if any
	 * - This property isn't rendered in any way, but it may be used to find out which button was clicked in a group of buttons.
	 */
	value?: string;

	/** True to disable keyboard focus (e.g. Tab key) for this button */
	disableKeyboardFocus?: boolean;

	/** True if user input should be disabled on this control */
	disabled = false;

	/** Target width of this button, in pixels or CSS length with unit */
	width?: string | number = undefined;

	/** The style to be applied to this button */
	buttonStyle: UITheme.StyleConfiguration<UIButtonStyle> = undefined;

	/**
	 * Returns the navigation target for this button
	 * - This method only returns a path (or {@link NavigationTarget} instance) if the {@link UIButton.navigateTo} property is set.
	 * - This method is called automatically by {@link ViewActivity}.
	 */
	getNavigationTarget() {
		return this.navigateTo;
	}
}

/**
 * A style class that includes default style properties for instances of {@link UIButton}
 * - Default styles are taken from {@link UITheme}.
 * - Extend or override this class to implement custom button styles, see {@link UITheme.BaseStyle} for details.
 */
export class UIButtonStyle extends UITheme.BaseStyle<
	"Button",
	UIComponent.DimensionsStyleType &
		UIComponent.DecorationStyleType &
		UIComponent.TextStyleType
> {
	constructor() {
		super("Button", UIButtonStyle);
	}
}

/**
 * A view class that represents a primary button control
 * - Refer to {@link UIButton} for information on button controls.
 * - This class uses the {@link UIPrimaryButtonStyle} style.
 *
 * **JSX tag:** `<primarybutton>`
 */
export class UIPrimaryButton extends UIButton {
	constructor(label?: StringConvertible) {
		super(label);
		this.buttonStyle = UIPrimaryButtonStyle;
	}
}

/**
 * A style class that includes default style properties for instances of {@link UIPrimaryButton}
 * - Default styles are taken from {@link UITheme}.
 * - Extend or override this class to implement custom primary button styles, see {@link UITheme.BaseStyle} for details.
 */
export class UIPrimaryButtonStyle extends UITheme.BaseStyle<
	"PrimaryButton",
	UIComponent.DimensionsStyleType &
		UIComponent.DecorationStyleType &
		UIComponent.TextStyleType
> {
	constructor() {
		super("PrimaryButton", UIPrimaryButtonStyle);
	}
}

/**
 * A view class that represents a plain button control
 * - Refer to {@link UIButton} for information on button controls.
 * - This class uses the {@link UIPlainButtonStyle} style.
 *
 * **JSX tag:** `<plainbutton>`
 */
export class UIPlainButton extends UIButton {
	constructor(label?: StringConvertible) {
		super(label);
		this.buttonStyle = UIPlainButtonStyle;
	}
}

/**
 * A style class that includes default style properties for instances of {@link UIPlainButton}
 * - Default styles are taken from {@link UITheme}.
 * - Extend or override this class to implement custom plain button styles, see {@link UITheme.BaseStyle} for details.
 */
export class UIPlainButtonStyle extends UITheme.BaseStyle<
	"PlainButton",
	UIComponent.DimensionsStyleType &
		UIComponent.DecorationStyleType &
		UIComponent.TextStyleType
> {
	constructor() {
		super("PlainButton", UIPlainButtonStyle);
	}
}

/**
 * A view class that represents a button control containing only a single icon
 * - Refer to {@link UIButton} for information on button controls.
 * - This class uses the {@link UIIconButtonStyle} style.
 *
 * **JSX tag:** `<iconbutton>`
 */
export class UIIconButton extends UIButton {
	constructor(label?: StringConvertible) {
		super(label);
		this.buttonStyle = UIIconButtonStyle;
	}
}

/**
 * A style class that includes default style properties for instances of {@link UIIconButton}
 * - Default styles are taken from {@link UITheme}.
 * - Extend or override this class to implement custom icon button styles, see {@link UITheme.BaseStyle} for details.
 */
export class UIIconButtonStyle extends UITheme.BaseStyle<
	"IconButton",
	UIComponent.DimensionsStyleType &
		UIComponent.DecorationStyleType &
		UIComponent.TextStyleType
> {
	constructor() {
		super("IconButton", UIIconButtonStyle);
	}
}
