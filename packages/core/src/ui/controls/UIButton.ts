import { NavigationTarget, ViewBuilder } from "../../app/index.js";
import {
	Binding,
	BindingOrValue,
	LazyString,
	StringConvertible,
} from "../../base/index.js";
import type { UIColor } from "../UIColor.js";
import { UIComponent } from "../UIComponent.js";
import type { UIIconResource } from "../UIIconResource.js";
import type { UIStyle } from "../UIStyle.js";

/**
 * A view class that represents a button control
 *
 * @description A button component is rendered on-screen as a button control.
 *
 * @online_docs Refer to the online documentation for more documentation on using this UI component class.
 */
export class UIButton extends UIComponent {
	/**
	 * Creates a new {@link ViewBuilder} instance for the current view class
	 * @see {@link View.getViewBuilder}
	 * @docgen {hide}
	 */
	static override getViewBuilder(
		preset: ViewBuilder.ExtendPreset<
			typeof UIComponent,
			UIButton,
			| "label"
			| "icon"
			| "iconSize"
			| "iconMargin"
			| "iconColor"
			| "chevron"
			| "chevronSize"
			| "chevronColor"
			| "navigateTo"
			| "disabled"
			| "width"
			| "pressed"
			| "value"
			| "primary"
			| "style"
		> & {
			/** True if keyboard focus should be disabled this button */
			disableKeyboardFocus?: BindingOrValue<boolean>;
		},
	) {
		// quietly change 'text' to label to support JSX tag content
		if ("text" in preset) {
			if (!("label" in preset)) preset.label = preset.text as any;
			delete (preset as any).text;
		}

		// use a 'link' role automatically if navigation target is specified
		if (preset.navigateTo !== undefined && !preset.accessibleRole) {
			preset.accessibleRole = "link";
		}

		return super.getViewBuilder(preset);
	}

	/** Creates a new button view object with the specified label */
	constructor(label?: StringConvertible) {
		super();
		this.label = label;
	}

	/** The button label to be displayed */
	label?: StringConvertible;

	/** The button icon to be displayed */
	icon?: UIIconResource = undefined;

	/** Icon size (in pixels or string with unit) */
	iconSize?: string | number;

	/** Space between icon and label text (in pixels or string with unit) */
	iconMargin?: string | number;

	/** Icon color */
	iconColor?: UIColor;

	/** Direction of chevron icon to be placed at the far end of the button, if any */
	chevron?: "up" | "down" | "next" | "back" = undefined;

	/** Chevron icon size (in pixels or string with unit) */
	chevronSize?: string | number;

	/** Space between chevron and the outside of the button (in pixels or string with unit) */
	chevronInset?: string | number;

	/** Chevron icon color */
	chevronColor?: UIColor;

	/**
	 * Navigation target to navigate to when this button is clicked
	 * - When set, the button will emit a `Navigate` event when clicked. This event is handled automatically by a containing {@link Activity}, if any. The target `pageId` will be filled in by the handling activity if it's not set here.
	 */
	navigateTo?:
		| string
		| LazyString
		| Partial<NavigationTarget>
		| { getNavigationTarget(): NavigationTarget };

	/**
	 * The current visual selection state
	 * - This property is not set automatically. It can be set manually, or bound using {@link Binding.matches()} to select and deselect the button based on the current value of a property.
	 */
	pressed?: boolean = undefined;

	/**
	 * An option value that this button represents, if any
	 * - This property isn't rendered in any way, but it may be used to find out which button was clicked in a group of buttons.
	 */
	value?: unknown;

	/** True to disable keyboard focus (e.g. Tab key) for this button */
	disableKeyboardFocus?: boolean;

	/** True if user input should be disabled on this control */
	disabled = false;

	/** Target width of this button, in pixels or CSS length with unit */
	width?: string | number = undefined;

	/**
	 * True if the primary button style should be applied to this label
	 * - The primary button style is defined by the theme, identified as PrimaryButton, and also available as `ui.style.BUTTON_PRIMARY`.
	 * - If the {@link style} property is set, this property is ignored.
	 */
	primary?: boolean;

	/** The style to be applied to this button */
	style?: UIStyle.TypeOrOverrides<UIButton.StyleType> = undefined;

	/**
	 * Returns the navigation target for this button
	 * - This method returns a {@link NavigationTarget} based on the {@link UIButton.navigateTo} property.
	 * - This method is called automatically by {@link Activity.onNavigate()}.
	 */
	getNavigationTarget() {
		return new NavigationTarget(this.navigateTo);
	}
}

export namespace UIButton {
	/** The type definition for styles applicable to {@link UIButton.style} */
	export type StyleType = UIComponent.DimensionsStyleType &
		UIComponent.DecorationStyleType &
		UIComponent.TextStyleType;
}
