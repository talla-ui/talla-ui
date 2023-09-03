import { Binding, strf, StringConvertible } from "../../core/index.js";
import type { NavigationTarget } from "../../app/index.js";
import type { UIColor } from "../UIColor.js";
import { UIControl } from "./UIControl.js";
import { UIStyle } from "../UIStyle.js";
import { UIIcon } from "../UIIcon.js";
import { UIComponent } from "../UIComponent.js";

/**
 * A view class that represents a button control
 *
 * @description A button component is rendered on-screen as a button control.
 *
 * **JSX tag:** `<button>`
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export class UIButton extends UIControl {
	/**
	 * Creates a preset button class with the specified label and click event
	 * - The specified label is localized using {@link strf} before being set as {@link UIButton.label}.
	 * @param label The button label
	 * @param onClick The name of the event to be emitted instead of (or in addition to, if starting with `+`) the Click event
	 * @returns A class that can be used to create instances of this button class with the provided label and click event handler
	 */
	static withLabel(label?: StringConvertible | Binding, onClick?: string) {
		if (typeof label === "string") label = strf(label);
		return this.with({ label, onClick });
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
		icon: UIIcon | `@${string}` | Binding,
		onClick?: string,
		size?: string | number,
		color?: UIColor | string,
	) {
		return this.with({ icon, iconSize: size, iconColor: color, onClick });
	}

	/** Creates a new button view object with the specified label */
	constructor(label?: StringConvertible) {
		super();
		this.style = UIStyle.Button;
		if (label !== undefined) this.label = label;

		// set selection state automatically
		this.listen((e) => {
			if (e.source === this) {
				if (e.name === "Select") {
					this.selected = true;
				} else if (e.name === "Deselect") {
					this.selected = false;
				}
			}
		});
	}

	/**
	 * Applies the provided preset properties to this object
	 * - This method is called automatically. Do not call this method after constructing a UI component.
	 */
	override applyViewPreset(
		preset: UIComponent.ViewPreset<
			UIControl,
			this,
			| "label"
			| "icon"
			| "iconSize"
			| "iconMargin"
			| "iconColor"
			| "iconAfter"
			| "navigateTo"
		> & {
			/** True if keyboard focus should be disabled this button */
			disableKeyboardFocus?: boolean | Binding<boolean>;
			/** Event that's emitted when the button is selected */
			onSelect?: string;
			/** Event that's emitted when the button is deselected */
			onDeselect?: string;
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
	icon?: UIIcon | `@${string}`;

	/** Icon size (in pixels or string with unit) */
	iconSize?: string | number;

	/** Margin between icon and label text (in pixels or string with unit) */
	iconMargin?: string | number;

	/** Icon color */
	iconColor?: UIColor | string;

	/** True if the icon should appear _after_ the text instead of before */
	iconAfter?: boolean;

	/**
	 * Path or navigation target to navigate to when this button is clicked
	 * - Set this property to `:back` to go navigate back in the location history stack.
	 */
	navigateTo?: StringConvertible | NavigationTarget;

	/** Current selection state, set automatically based on Select and Deselect events */
	selected?: boolean;

	/** True to disable keyboard focus (e.g. Tab key) for this button */
	disableKeyboardFocus?: boolean;

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
 * A view class that represents a primary button control
 * - Refer to {@link UIButton} for information on button controls.
 * - This class uses the {@link UIStyle.PrimaryButton} style.
 *
 * **JSX tag:** `<primarybutton>`
 */
export class UIPrimaryButton extends UIButton {
	constructor(label?: StringConvertible) {
		super(label);
		this.style = UIStyle.PrimaryButton;
	}
}

/**
 * A view class that represents a button control without any visible borders
 * - Refer to {@link UIButton} for information on button controls.
 * - This class uses the {@link UIStyle.BorderlessButton} style.
 *
 * **JSX tag:** `<borderlessbutton>`
 */
export class UIBorderlessButton extends UIButton {
	constructor(label?: StringConvertible) {
		super(label);
		this.style = UIStyle.BorderlessButton;
	}
}

/**
 * A view class that represents a button control with a visible border
 * - Refer to {@link UIButton} for information on button controls.
 * - This class uses the {@link UIStyle.OutlineButton} style.
 *
 * **JSX tag:** `<outlinebutton>`
 */
export class UIOutlineButton extends UIButton {
	constructor(label?: StringConvertible) {
		super(label);
		this.style = UIStyle.OutlineButton;
	}
}

/**
 * A view class that represents a button control that appears as a hyperlink
 * - Refer to {@link UIButton} for information on button controls.
 * - This class uses the {@link UIStyle.LinkButton} style.
 *
 * **JSX tag:** `<linkbutton>`
 */
export class UILinkButton extends UIButton {
	constructor(label?: StringConvertible) {
		super(label);
		this.style = UIStyle.LinkButton;
	}
}

/**
 * A view class that represents a button control containing only a single icon
 * - Refer to {@link UIButton} for information on button controls.
 * - This class uses the {@link UIStyle.IconButton} style.
 *
 * **JSX tag:** `<iconbutton>`
 */
export class UIIconButton extends UIButton {
	constructor(label?: StringConvertible) {
		super(label);
		this.style = UIStyle.IconButton;
	}
}
