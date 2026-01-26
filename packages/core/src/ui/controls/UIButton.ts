import { fmt, StringConvertible } from "@talla-ui/util";
import {
	AppContext,
	FormState,
	ModalMenuOptions,
	ViewBuilder,
	ViewBuilderEventHandler,
} from "../../app/index.js";
import {
	Binding,
	BindingOrValue,
	ObservableEvent,
} from "../../object/index.js";
import { UIIconResource } from "../style/index.js";
import { UIElement } from "../UIElement.js";
import { UIText } from "./UIText.js";

/**
 * A view class that represents a button control.
 * - Buttons emit events when clicked, including a `Navigate` event if {@link navigateTo} is set.
 * - Use the {@link UI.Button()} function to create buttons using a builder.
 *
 * @online_docs Refer to the online documentation for more information on using this UI element class.
 */
export class UIButton extends UIElement {
	/** Creates a new button view object with the specified text. */
	constructor(text?: StringConvertible) {
		super();
		this.text = text;
	}

	/** The button text to be displayed. */
	text?: StringConvertible;

	/** The button icon to be displayed. */
	icon?: UIIconResource = undefined;

	/** The style options for displaying the button icon. */
	iconStyle?: UIText.IconStyle = undefined;

	/**
	 * The direction of a chevron icon placed at the far end of the button.
	 * - Valid values are `up`, `down`, `next`, or `back`.
	 */
	chevron?: "up" | "down" | "next" | "back" = undefined;

	/** The style options for displaying the chevron icon. */
	chevronStyle?: UIText.IconStyle = undefined;

	/**
	 * The navigation target to navigate to when this button is clicked.
	 * - If set, the button emits a `Navigate` event when clicked, which is handled automatically by a containing {@link Activity}.
	 * - Paths starting with a dot are treated as relative to the current activity's navigation path.
	 */
	navigateTo?: StringConvertible;

	/**
	 * The current visual pressed state.
	 * - This property is not set automatically; set it manually or bind it to reflect application state.
	 */
	pressed?: boolean = undefined;

	/**
	 * An arbitrary value associated with this button.
	 * - This property is not rendered, but can be used to identify which button was clicked in a group, either directly or from event data.
	 */
	value?: unknown;

	/**
	 * True if keyboard focus (e.g. Tab key) should be disabled for this button.
	 */
	disableKeyboardFocus?: boolean;

	/** True if user input should be disabled on this control. */
	disabled = false;

	/**
	 * Returns the navigation target for this button.
	 * - Returns the value of the {@link navigateTo} property.
	 * - Called automatically by {@link Activity.onNavigate()}.
	 */
	getNavigationTarget() {
		return this.navigateTo;
	}
}

export namespace UIButton {
	/** Default style names for button elements. */
	export type StyleName =
		| "default"
		| "accent"
		| "success"
		| "danger"
		| "ghost"
		| "text"
		| "link"
		| "small"
		| "icon"
		| "accentIcon"
		| "successIcon"
		| "dangerIcon"
		| "iconTop"
		| "iconTopStart"
		| "iconTopEnd";

	/**
	 * Creates a view builder for a button element.
	 * @param text The text for the button, or a binding to a string value.
	 * @returns A builder object for configuring the button.
	 * @see {@link UIButton}
	 */
	export function buttonBuilder(text?: BindingOrValue<StringConvertible>) {
		return new ButtonBuilder().text(text);
	}

	export namespace buttonBuilder {
		/**
		 * Creates a view builder for a button element with localizable or dynamic text.
		 * @param text The text to display, passed to {@link fmt()} or {@link Binding.fmt()}.
		 * @param args Additional bindings used to format the text dynamically.
		 * @returns A builder instance for chaining.
		 */
		export function fmt(text: StringConvertible, ...args: Binding[]) {
			return new ButtonBuilder().fmt(text, ...args);
		}
	}

	/**
	 * A builder class for creating {@link UIButton} instances.
	 * - Returned by the {@link UI.Button()} function.
	 */
	export class ButtonBuilder extends UIElement.ElementBuilder<
		UIButton,
		UIButton.StyleName
	> {
		/** The initializer used to create each button instance. */
		readonly initializer = new ViewBuilder.Initializer(UIButton);

		/**
		 * Sets the button text.
		 * @param text The text to display, or a binding to a string value.
		 * @returns The builder instance for chaining.
		 */
		text(text?: BindingOrValue<StringConvertible>) {
			return this.setProperty("text", text);
		}

		/**
		 * Sets localizable or dynamic text for the button.
		 * @param text The text to display, passed to {@link fmt()} or {@link Binding.fmt()}.
		 * @param args Additional bindings used to format the text dynamically.
		 * @returns The builder instance for chaining.
		 */
		fmt(text: StringConvertible, ...args: Binding[]) {
			if (args.length === 0) return this.text(fmt(text));
			return this.text(Binding.fmt(text, ...args));
		}

		/**
		 * Sets the button icon.
		 * @param icon An icon resource, an icon name, or a binding.
		 * @param iconStyle Styling options for the icon, or only the icon size in pixels.
		 * @returns The builder instance for chaining.
		 */
		icon(
			icon: BindingOrValue<
				UIIconResource | UIIconResource.IconName | undefined
			>,
			iconStyle?: BindingOrValue<UIText.IconStyle> | number,
		) {
			return this.setIconProperty(icon, iconStyle);
		}

		/**
		 * Adds a chevron icon to the button.
		 * @param chevron The direction of the chevron; defaults to `down`.
		 * @param chevronStyle Styling options for the chevron, or only the icon size in pixels.
		 * @returns The builder instance for chaining.
		 */
		chevron(
			chevron: BindingOrValue<"up" | "down" | "next" | "back"> = "down",
			chevronStyle?: BindingOrValue<UIText.IconStyle> | number,
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
		 * Disables the button.
		 * @param disabled True to disable the button; defaults to true.
		 * @returns The builder instance for chaining.
		 */
		disabled(disabled: BindingOrValue<boolean> = true) {
			return this.setProperty("disabled", disabled);
		}

		/**
		 * Sets the visual pressed state of the button.
		 * @param pressed True if the button appears pressed; defaults to true.
		 * @returns The builder instance for chaining.
		 */
		pressed(pressed: BindingOrValue<boolean> = true) {
			return this.setProperty("pressed", pressed);
		}

		/**
		 * Associates an arbitrary value with the button.
		 * @param value The value to associate.
		 * @returns The builder instance for chaining.
		 */
		value(value?: BindingOrValue<unknown>) {
			return this.setProperty("value", value);
		}

		/**
		 * Adds a two-way binding to a form state field.
		 * @param formState A binding to a form state object.
		 * @param formField The name of the form field to bind to.
		 * @returns The builder instance for chaining.
		 */
		formStateValue(
			formState: Binding<FormState | undefined>,
			formField: string,
		) {
			this.initializer.observeFormState(formState, formField, "value");
			return this;
		}

		/**
		 * Sets a navigation target, making the button behave like a link.
		 * @param navigateTo The navigation path.
		 * @returns The builder instance for chaining.
		 */
		navigateTo(navigateTo?: BindingOrValue<StringConvertible>) {
			this.setProperty("accessibleRole", "link");
			return this.setProperty("navigateTo", navigateTo);
		}

		/**
		 * Adds a modal menu that shows when the button is clicked.
		 * - The button emits a `MenuItemSelect` event when a menu item is selected, with the selected item as data.
		 * - The button's {@link UIButton.value} property is set to the selected item's value.
		 * @param menu An instance of {@link ModalMenuOptions}.
		 * @returns The builder instance for chaining.
		 */
		dropdownMenu(menu: ModalMenuOptions) {
			let showing: UIButton | undefined;
			this._showMenu ||= (button) => {
				return AppContext.getInstance().showModalMenuAsync(menu, button);
			};
			const showMenu = async (_: ObservableEvent, button: UIButton) => {
				if (showing === button) return;
				showing = button;
				button.pressed = true;
				let value = await this._showMenu!(button);
				button.pressed = false;
				showing = undefined;
				if (value != null) {
					button.value = value;
					let item = menu.items.find((item) => item.value === value);
					if (item) button.emit("MenuItemSelect", item);
				}
			};
			return this.onClick(showMenu).onPress(showMenu);
		}

		/**
		 * Adds a modal menu for selecting a value from a list of options.
		 * - The button's current value determines the checked item in the menu; bind using {@link value()} or {@link formStateValue()}.
		 * - The button's {@link UIButton.text} property is set to the selected item's text.
		 * - The button emits a `MenuItemSelect` event when a menu item is selected.
		 * @param menu An instance of {@link ModalMenuOptions}, or a list of items.
		 * @returns The builder instance for chaining.
		 */
		dropdownPicker(menu: ModalMenuOptions | ModalMenuOptions.MenuItem[]) {
			if (Array.isArray(menu)) {
				menu = new ModalMenuOptions(menu, "100%");
			}
			let items = menu.items;
			this._showMenu = (button) => {
				items = items.map((it) => ({
					...it,
					icon:
						it.value === button.value
							? UIIconResource.getIcon("check")
							: undefined,
				}));
				return AppContext.getInstance().showModalMenuAsync(
					new ModalMenuOptions(items, menu.width, menu.minWidth),
					button,
				);
			};
			this.initializer.initialize((button) => {
				let buffer = "";
				let lastKeyTime = 0;
				button.listen((e) => {
					if (e.name !== "KeyDown") return;
					let key = e.data.key;
					if (key === "ArrowDown" || key === "ArrowUp") {
						let idx = items.findIndex((it) => it.value === button.value);
						let item = items[idx + (key === "ArrowUp" ? -1 : 1)];
						if (item && !item.divider && !item.disabled) {
							button.value = item.value;
							button.emit("MenuItemSelect", item);
						}
						return;
					}
					let letter = String(key).toUpperCase();
					if (letter.length !== 1) return;
					let now = Date.now();
					buffer = now - lastKeyTime > 500 ? letter : buffer + letter;
					lastKeyTime = now;
					let item = items.find(
						(it: any) =>
							!it.disabled && String(it.text).toUpperCase().startsWith(buffer),
					);
					if (item) {
						button.value = item.value;
						button.emit("MenuItemSelect", item);
					}
				});
				button.observe("value", (value) => {
					let item = value != null && items.find((it) => it.value === value);
					if (item) button.text = (item as any).text;
				});
			});
			return this.accessibleRole("button").dropdownMenu(menu);
		}

		/**
		 * Handles the `MenuItemSelect` event emitted when a menu item is selected.
		 * @param select The function to call, or the name of an event to emit instead.
		 * @returns The builder instance for chaining.
		 * @see {@link dropdownMenu()}
		 */
		onMenuItemSelect(
			select:
				| string
				| ViewBuilderEventHandler<UIButton, ModalMenuOptions.MenuItem>,
		) {
			return this.on("MenuItemSelect", select);
		}

		/**
		 * Disables keyboard focus for the button.
		 * @param disableKeyboardFocus True to disable keyboard focus; defaults to true.
		 * @returns The builder instance for chaining.
		 */
		disableKeyboardFocus(disableKeyboardFocus = true) {
			return this.setProperty("disableKeyboardFocus", disableKeyboardFocus);
		}

		private _showMenu: ((button: UIButton) => Promise<unknown>) | undefined;
	}
}
