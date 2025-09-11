import { fmt, StringConvertible } from "@talla-ui/util";
import {
	AppContext,
	FormState,
	ModalMenuOptions,
	ViewBuilder,
} from "../../app/index.js";
import {
	bind,
	Binding,
	BindingOrValue,
	isBinding,
	ObservableEvent,
} from "../../object/index.js";
import { UIIconResource, UIStyle } from "../style/index.js";
import type { UI } from "../UI.js";
import { UIElement } from "../UIElement.js";
import { UILabel } from "./UILabel.js";

/**
 * A view class that represents a button control
 *
 * @description A button UI element is rendered as a button control.
 *
 * @online_docs Refer to the online documentation for more information on using this UI element class.
 */
export class UIButton extends UIElement {
	/** Creates a new button view object with the specified label */
	constructor(text?: StringConvertible) {
		super();
		this.text = text;
	}

	/** The button label to be displayed */
	text?: StringConvertible;

	/** The button icon to be displayed */
	icon?: UIIconResource = undefined;

	/** Options for displaying the button icon */
	iconStyle?: UILabel.IconStyle = undefined;

	/** Direction of chevron icon to be placed at the far end of the button, if any */
	chevron?: "up" | "down" | "next" | "back" = undefined;

	/** Options for displaying the chevron icon */
	chevronStyle?: UILabel.IconStyle = undefined;

	/**
	 * Navigation target to navigate to when this button is clicked
	 * - If this property is set, the button will emit a `Navigate` event when clicked. This event is handled automatically by a containing {@link Activity}, if any. If the target starts with a dot, it's treated as a relative path to the current activity's navigation path.
	 */
	navigateTo?: StringConvertible;

	/**
	 * The current visual selection state
	 * - This property is not set automatically. It can be set manually, or bound to select and deselect the button based on the current application state.
	 */
	pressed?: boolean = undefined;

	/**
	 * An option value that's associated with this button
	 * - This property isn't rendered in any way, but it may be used to find out which button was clicked in a group of buttons, either using the property directly or from the event data property that's added to events emitted by the button.
	 */
	value?: unknown;

	/** True to disable keyboard focus (e.g. Tab key) for this button */
	disableKeyboardFocus?: boolean;

	/** True if user input should be disabled on this control */
	disabled = false;

	/**
	 * Returns the navigation target for this button
	 * - This method returns the value of the {@link UIButton.navigateTo} property, and is called automatically by {@link Activity.onNavigate()}.
	 */
	getNavigationTarget() {
		return this.navigateTo;
	}
}

export namespace UIButton {
	/**
	 * Creates a view builder for a button element
	 * @param text The text label for the button, or a binding to a string value.
	 * @returns A builder object for configuring the button.
	 * @see {@link UIButton}
	 */
	export function buttonBuilder(text?: BindingOrValue<StringConvertible>) {
		return new ButtonBuilder().text(text);
	}

	export namespace buttonBuilder {
		/**
		 * Creates a view builder for a button element with a localizable or dynamic text label.
		 * @param text The text to display, passed to {@link fmt()} or {@link bind.fmt()}
		 * @param args Additional bindings, used to format the text dynamically
		 * @returns A builder instance for chaining.
		 */
		export function fmt(text: StringConvertible, ...args: Binding[]) {
			return new ButtonBuilder().fmt(text, ...args);
		}
	}

	/**
	 * A builder class for creating `UIButton` instances.
	 * - Objects of this type are returned by the `UI.Button()` function.
	 */
	export class ButtonBuilder extends UIElement.ElementBuilder<UIButton> {
		/** The initializer that is used to create each button instance */
		readonly initializer = new ViewBuilder.Initializer(UIButton);

		/**
		 * Sets the text label for the button, using {@link UIButton.text}.
		 * @param text The text to display, or a binding to a string value.
		 * @returns The builder instance for chaining.
		 */
		text(text?: BindingOrValue<StringConvertible>) {
			return this.setProperty("text", text);
		}

		/**
		 * Sets a localizable or dynamic text label for the button.
		 * @param text The text to display, passed to {@link fmt()} or {@link bind.fmt()}
		 * @param args Additional bindings, used to format the text dynamically
		 * @returns The builder instance for chaining.
		 */
		fmt(text: StringConvertible, ...args: Binding[]) {
			if (args.length === 0) return this.text(fmt(text));
			return this.text(bind.fmt(text, ...args));
		}

		/**
		 * Sets the icon for the button, using {@link UIButton.icon}.
		 * @param icon An icon resource, a theme icon name, or a binding to an icon.
		 * @param iconStyle Styling options for the icon, or only the icon size (in pixels).
		 * @returns The builder instance for chaining.
		 */
		icon(
			icon: UI.IconName | BindingOrValue<UIIconResource | string | undefined>,
			iconStyle?: BindingOrValue<UILabel.IconStyle> | number,
		) {
			if (iconStyle != null) {
				this.initializer.update(iconStyle, function (value) {
					this.iconStyle = typeof value === "number" ? { size: value } : value;
				});
			}
			if (typeof icon === "string") {
				icon = UIIconResource.theme.ref(icon as any);
			} else if (isBinding(icon)) {
				icon = icon.map((value) =>
					typeof value === "string"
						? UIIconResource.theme.ref(value as any)
						: value,
				);
			}
			return this.setProperty("icon", icon);
		}

		/**
		 * Adds a chevron icon to the button, using {@link UIButton.chevron}.
		 * @param chevron The direction of the chevron (`up`, `down`, `next`, `back`), defaults to `down`.
		 * @param chevronStyle Styling options for the chevron, or only the icon size (in pixels).
		 * @returns The builder instance for chaining.
		 */
		chevron(
			chevron: BindingOrValue<"up" | "down" | "next" | "back"> = "down",
			chevronStyle?: BindingOrValue<UILabel.IconStyle> | number,
		) {
			if (chevronStyle != null) {
				this.initializer.update(chevronStyle, function (value) {
					this.chevronStyle =
						typeof value === "number" ? { size: value } : value;
				});
			}
			return this.setProperty("chevron", chevron);
		}

		/**
		 * Disables the button, using {@link UIButton.disabled}.
		 * @param disabled If `true`, the button is disabled. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		disabled(disabled: BindingOrValue<boolean> = true) {
			return this.setProperty("disabled", disabled);
		}

		/**
		 * Sets the visual pressed state of the button, using {@link UIButton.pressed}.
		 * @param pressed If `true`, the button appears pressed. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		pressed(pressed: BindingOrValue<boolean> = true) {
			return this.setProperty("pressed", pressed);
		}

		/**
		 * Associates an arbitrary value with the button, using {@link UIButton.value}.
		 * @param value The value to associate.
		 * @returns The builder instance for chaining.
		 */
		value(value?: BindingOrValue<unknown>) {
			return this.setProperty("value", value);
		}

		/**
		 * Adds a two-way binding to a form state field.
		 * @param formState A form state object, or a binding to one (e.g. on an activity).
		 * @param formField The name of the form field to which the button value should be bound.
		 * @returns The builder instance for chaining.
		 */
		formStateValue(
			formState: BindingOrValue<FormState | undefined>,
			formField: string,
		) {
			return this.observeFormState(formState, formField, (value) => value);
		}

		/**
		 * Applies a style to the button
		 * @param style The name of a theme button style, a {@link UIStyle} instance, a style options (overrides) object, or a binding.
		 * @returns The builder instance for chaining.
		 */
		buttonStyle(
			style?: BindingOrValue<
				UI.styles.ButtonStyleName | UIStyle | UIStyle.StyleOptions | undefined
			>,
		) {
			return this.setStyleProperty(style, UIStyle.theme.button);
		}

		/**
		 * Sets a navigation target for the button, making it behave like a link.
		 * @param navigateTo A path string
		 * @returns The builder instance for chaining.
		 */
		navigateTo(navigateTo?: BindingOrValue<StringConvertible>) {
			this.setProperty("accessibleRole", "link");
			return this.setProperty("navigateTo", navigateTo);
		}

		/**
		 * Adds a modal menu that shows when the button is clicked.
		 * - The button emits a `MenuItemSelect` event when a menu item is selected, with the selected menu item as data (including its `value` property).
		 * - When a menu item is selected, the button {@link UIButton.value value} property is also set to the selected menu item's `value` property.
		 * @param menu An instance of {@link ModalMenuOptions}.
		 * @returns The builder instance for chaining.
		 */
		dropdownMenu(menu: ModalMenuOptions) {
			this._showMenu ||= (button) => {
				return AppContext.getInstance().showModalMenuAsync(menu, button);
			};
			const showMenu = async (_: ObservableEvent, button: UIButton) => {
				button.pressed = true;
				let value = await this._showMenu!(button);
				button.pressed = false;
				if (value == null) return;
				button.value = value;
				let item = menu.items.find((item) => item.value === value);
				if (item) button.emit("MenuItemSelect", item);
			};
			this.onClick(showMenu);
			this.onPress(showMenu);
			return this;
		}

		/**
		 * Adds a modal menu that allows the user to select a value from a list of options.
		 * - The current value of the button determines the 'checked' item in the menu. This property can be bound using {@link UIButton.ButtonBuilder.value()} or {@link UIButton.ButtonBuilder.formStateValue()}.
		 * - The button {@link UIButton.text text} property is set to the text of the selected menu item, if any.
		 * - The button emits a `MenuItemSelect` event when a menu item is selected, with the selected menu item as data (including its `value` property).
		 * @param menu An instance of {@link ModalMenuOptions}.
		 * @returns The builder instance for chaining.
		 */
		dropdownPicker(menu: ModalMenuOptions) {
			this._showMenu = (button) => {
				return AppContext.getInstance().showModalMenuAsync((options) => {
					options.width = menu.width;
					options.minWidth = menu.minWidth;
					options.items = menu.items.map((it) => ({
						...it,
						icon: UIIconResource.theme.ref(
							it.value === button.value ? "check" : "blank",
						),
					}));
				}, button);
			};
			this.initializer.initialize((button) => {
				button.observe("value", (value) => {
					if (value == null) return;
					for (let item of menu.items) {
						if (item.value === value) {
							button.text = item.text;
							break;
						}
					}
				});
			});
			return this.dropdownMenu(menu);
		}

		/**
		 * Handles the `MenuItemSelect` event, emitted when a menu item is selected.
		 * @param handle The function to call, or name of the event to emit instead
		 * @see {@link UIElement.ElementBuilder.handle()}
		 * @see {@link UIButton.ButtonBuilder.dropdownMenu()}
		 */
		onMenuItemSelect(
			select:
				| string
				| ((
						event: ObservableEvent<UIButton, ModalMenuOptions.MenuItem>,
						button: UIButton,
				  ) => void),
		) {
			return this.handle("MenuItemSelect", select as any);
		}

		/**
		 * Disables keyboard focus for the button.
		 * @param disableKeyboardFocus If `true`, the button cannot be focused using the keyboard. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		disableKeyboardFocus(disableKeyboardFocus = true) {
			return this.setProperty("disableKeyboardFocus", disableKeyboardFocus);
		}

		private _showMenu: ((button: UIButton) => Promise<unknown>) | undefined;
	}
}
