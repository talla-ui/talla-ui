import type {
	RenderContext,
	View,
	ViewClass,
	ViewComposite,
} from "../app/index.js";
import type { Binding, BindingOrValue, LazyString } from "../base/index.js";
import type { UIColor } from "./UIColor.js";
import type { UIIconResource } from "./UIIconResource.js";
import { UIStyle } from "./UIStyle.js";
import type { UITheme } from "./UITheme.js";
import type { UIAnimationView } from "./composites/UIAnimationView.js";
import type { UIConditionalView } from "./composites/UIConditionalView.js";
import type { UIListView } from "./composites/UIListView.js";
import type { UIViewRenderer } from "./composites/UIViewRenderer.js";
import type { UIAnimatedCell, UICell } from "./containers/UICell.js";
import type { UIColumn } from "./containers/UIColumn.js";
import type { UIContainer } from "./containers/UIContainer.js";
import type { UIRow } from "./containers/UIRow.js";
import type { UIScrollContainer } from "./containers/UIScrollContainer.js";
import type { UIButton } from "./controls/UIButton.js";
import type { UIImage } from "./controls/UIImage.js";
import type { UILabel } from "./controls/UILabel.js";
import type { UISeparator } from "./controls/UISeparator.js";
import type { UISpacer } from "./controls/UISpacer.js";
import type { UITextField } from "./controls/UITextField.js";
import type { UIToggle } from "./controls/UIToggle.js";

/**
 * An object with functions for creating UI components and other resources
 */
export const ui: Readonly<ui> = Object.create(null) as any;
export namespace ui {
	/**
	 * Type definition for a UI component preset object
	 * - This type is used to define the properties, bindings, and event handlers that can be preset on UI components using functions such as `ui.button(...)`.
	 */
	export type PresetType<
		T extends View,
		TPreset = T extends ViewComposite & {
			new (p?: infer TPreset): ViewComposite;
		}
			? TPreset
			: View.ExtendPreset<T>,
	> = TPreset;

	/** Type alias for values that are accepted as style presets for a {@link UICell} */
	export type CellStyle = UIStyle.TypeOrOverrides<UICell.StyleType>;

	/** Type alias for values that are accepted as style presets for a {@link UILabel} */
	export type LabelStyle = UIStyle.TypeOrOverrides<UILabel.StyleType>;

	/** Type alias for values that are accepted as style presets for a {@link UIButton} */
	export type ButtonStyle = UIStyle.TypeOrOverrides<UIButton.StyleType>;

	/** Type alias for values that are accepted as style presets for a {@link UIImage} */
	export type ImageStyle = UIStyle.TypeOrOverrides<UIImage.StyleType>;

	/** Type alias for values that are accepted as style presets for a {@link UITextField} */
	export type TextFieldStyle = UIStyle.TypeOrOverrides<UITextField.StyleType>;

	/** Type alias for values that are accepted as style presets for a {@link UIToggle} */
	export type ToggleStyle = UIStyle.TypeOrOverrides<UIToggle.StyleType>;

	/** Type alias for values that are accepted as label style presets for a {@link UIToggle} */
	export type ToggleLabelStyle =
		UIStyle.TypeOrOverrides<UIToggle.LabelStyleType>;

	/**
	 * Placement attributes to be used with `<mount>` or {@link ui.mount()}
	 * - Use only the `page` _or_ `screen` property to render the view as a full-screen page
	 * - Use only the `id` property to render the view with a specific mount ID (e.g. HTML element `id`)
	 * - Otherwise, set the `place` property to a custom {@link RenderContext.PlacementOptions} object
	 * @see {@link ui.mount}
	 */
	export type MountPlacement = {
		/** True if the view should be rendered as a full-screen scrollable page */
		page?: true;
		/** True if the view should be rendered as a full-screen page */
		screen?: true;
		/** Target mount ID (e.g. HTML element `id`) */
		id?: string;
		/** Custom placement options */
		place?: RenderContext.PlacementOptions;
	};

	/**
	 * Type definition for using {@link ui.jsx}
	 * @hidedocs
	 */
	export namespace JSX {
		export type Element = ViewClass;
		export interface IntrinsicElements {
			cell: ui.PresetType<UICell>;
			column: ui.PresetType<UIColumn>;
			row: ui.PresetType<UIRow>;
			scroll: ui.PresetType<UIScrollContainer>;
			animatedcell: ui.PresetType<UIAnimatedCell>;
			label: ui.PresetType<UILabel>;
			button: ui.PresetType<UIButton>;
			textfield: ui.PresetType<UITextField>;
			toggle: ui.PresetType<UIToggle>;
			separator: ui.PresetType<UISeparator>;
			spacer: ui.PresetType<UISpacer>;
			image: ui.PresetType<UIImage>;
			render: ui.PresetType<UIViewRenderer>;
			animate: ui.PresetType<UIAnimationView>;
			conditional: ui.PresetType<UIConditionalView>;
			list: ui.PresetType<UIListView>;
			mount: ui.MountPlacement;
		}
	}
}
export interface ui {
	/**
	 * JSX support for UI components
	 *
	 * @summary This function provides support for JSX elements, when used in `.jsx` or `.tsx` files. it's used by the TypeScript compiler (or any other JSX compiler) to convert JSX elements to function calls.
	 *
	 * @note To enable JSX support for TypeScript projects, set the `jsxFactory` configuration to `ui.jsx`, and import `ui` in each `.tsx` file to allow the compiler to access it.
	 *
	 * **Bindings in label text** — Several JSX elements accept text content, namely `<label>`, `<button>`, `<toggle>`, and `<textfield>` (for placeholder text). This text is assigned to the `text`, `label`, or `placeholder` properties, and may consist of plain text and bindings (i.e. the result of {@link bind()}, refer to {@link Binding} for more information).
	 *
	 * As a shortcut within JSX text content, bindings may also be specified directly using `%[...]` syntax, which are used with {@link bind.strf()}. In addition, this syntax may be used with aliases and default string values:
	 *
	 * - `Foo: %[foo]` — inserts a binding for `foo`
	 * - `Foo: %[foo:.2f]` — inserts a binding for `foo`, and uses {@link bind.strf()} to format the bound value as a number with 2 decimals
	 * - `Foo: %[foo=somePropertyName]` — inserts a binding for `somePropertyName`, but allows for localization of `Foo: %[foo]` instead
	 * - `Foo: %[foo=another.propertyName:.2f]` — inserts a bindings for `another.propertyName`, but allows for localization of `Foo: %[foo:.2f]` instead.
	 * - `Foo: %[foo=some.numProp:?||None]` — inserts a binding for `some.numProp`, but allows for localization of `Foo: %[foo:?||None]` instead (and inserts `None` if the value for `some.numProp` is undefined or an empty string).
	 */
	jsx(f: string, presets: any, ...rest: any[]): ViewClass;

	/**
	 * Creates a preset view that renders the embedded view as a full-screen page
	 * - This function is equivalent to `ui.mount({ page: true }, content)`
	 */
	page(content: ViewClass): ViewClass;

	/**
	 * Creates a preset view that renders the embedded view with the specified placement options
	 * @param options A set of properties indicating how the view should be placed
	 * @param content The content that will be rendered
	 * @returns A new view class with the specified placement options
	 * @see {@link ui.MountPlacement}
	 */
	mount(options: ui.MountPlacement, content: ViewClass): ViewClass;

	/**
	 * Creates a preset {@link UICell} constructor using the provided options and content
	 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class (optional)
	 * @param content The content that will be added to each instance of the resulting class
	 * @returns A new class that extends {@link UICell}
	 */
	cell(
		preset: ui.PresetType<UICell>,
		...content: ViewClass[]
	): ViewClass<UICell>;
	cell(...content: ViewClass[]): ViewClass<UICell>;

	/**
	 * Creates a preset {@link UIColumn} constructor using the provided options and content
	 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class (optional)
	 * @param content The content that will be added to each instance of the resulting class
	 * @returns A new class that extends {@link UIColumn}
	 */
	column(
		preset: ui.PresetType<UIColumn>,
		...content: ViewClass[]
	): ViewClass<UIColumn>;
	column(...content: ViewClass[]): ViewClass<UIColumn>;

	/**
	 * Creates a preset {@link UIRow} constructor using the provided options and content
	 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class (optional)
	 * @param content The content that will be added to each instance of the resulting class
	 * @returns A new class that extends {@link UIRow}
	 */
	row(preset: ui.PresetType<UIRow>, ...content: ViewClass[]): ViewClass<UIRow>;
	row(...content: ViewClass[]): ViewClass<UIRow>;

	/**
	 * Creates a preset {@link UIScrollContainer} constructor using the provided options and content
	 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class (optional)
	 * @param content The content that will be added to each instance of the resulting class
	 * @returns A new class that extends {@link UIScrollContainer}
	 */
	scroll(
		preset: ui.PresetType<UIScrollContainer>,
		...content: ViewClass[]
	): ViewClass<UIScrollContainer>;
	scroll(...content: ViewClass[]): ViewClass<UIScrollContainer>;

	/**
	 * Creates a preset {@link UIAnimatedCell} constructor using the provided options and content
	 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class (optional)
	 * @param content The content that will be added to each instance of the resulting class
	 * @returns A new class that extends {@link UIAnimatedCell}
	 */
	animatedCell(
		preset: ui.PresetType<UIAnimatedCell>,
		content?: ViewClass,
	): ViewClass<UIAnimatedCell>;

	/**
	 * Creates a preset {@link UILabel} constructor using the provided options
	 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class
	 * @param text Preset label text
	 * @param style Preset label style (optional)
	 * @returns A new class that extends {@link UILabel}
	 */
	label(
		preset: ui.PresetType<UILabel>,
		text?: BindingOrValue<string | LazyString>,
		style?: UIStyle.TypeOrOverrides<UILabel.StyleType>,
	): ViewClass<UILabel>;
	label(
		text?: BindingOrValue<string | LazyString>,
		style?: UIStyle.TypeOrOverrides<UILabel.StyleType>,
	): ViewClass<UILabel>;

	/**
	 * Creates a preset {@link UIButton} constructor using the provided options
	 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class
	 * @param label Preset button label
	 * @param onClick Preset Click event specifier (optional)
	 * @param style Preset button style (optional)
	 * @returns A new class that extends {@link UILabel}
	 */
	button(
		preset: ui.PresetType<UIButton>,
		label?: BindingOrValue<string | LazyString>,
		onClick?: string,
		style?: UIStyle.TypeOrOverrides<UIButton.StyleType>,
	): ViewClass<UIButton>;
	button(
		label?: BindingOrValue<string | LazyString>,
		onClick?: string,
		style?: UIStyle.TypeOrOverrides<UIButton.StyleType>,
	): ViewClass<UIButton>;

	/**
	 * Creates a preset {@link UITextField} constructor using the provided options
	 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class
	 * @returns A new class that extends {@link UITextField}
	 */
	textField(preset: ui.PresetType<UITextField>): ViewClass<UITextField>;

	/**
	 * Creates a preset {@link UIToggle} constructor using the provided options
	 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class
	 * @returns A new class that extends {@link UIToggle}
	 */
	toggle(preset: ui.PresetType<UIToggle>): ViewClass<UIToggle>;

	/**
	 * Creates a preset {@link UISeparator} constructor using the provided options
	 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class
	 * @returns A new class that extends {@link UISeparator}
	 */
	separator(preset?: ui.PresetType<UISeparator>): ViewClass<UISeparator>;

	/**
	 * Creates a preset {@link UISpacer} constructor using the provided options
	 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class
	 * @param width Preset spacer width
	 * @param height Preset spacer height
	 * @param minWidth Preset spacer minimum width
	 * @param minHeight Preset spacer minimum height
	 * @returns A new class that extends {@link UISpacer}
	 */
	spacer(preset: ui.PresetType<UISpacer>): ViewClass<UISpacer>;
	spacer(
		width?: number | string,
		height?: number | string,
	): ViewClass<UISpacer>;

	/**
	 * Creates a preset {@link UIImage} constructor using the provided options
	 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class
	 * @returns A new class that extends {@link UIImage}
	 */
	image(preset: ui.PresetType<UIImage>): ViewClass<UIImage>;

	/**
	 * Creates a preset {@link UIViewRenderer} constructor using the provided options
	 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class
	 * @returns A new class that extends {@link UIViewRenderer}
	 */
	renderView(preset: ui.PresetType<UIViewRenderer>): ViewClass<UIViewRenderer>;
	renderView(view: BindingOrValue<ViewClass>): ViewClass<UIViewRenderer>;

	/**
	 * Creates a preset {@link UIAnimationView} constructor using the provided options
	 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class
	 * @param content The content that will be added to each instance of the resulting class
	 * @returns A new class that extends {@link UIAnimationView}
	 */
	animate(
		preset: ui.PresetType<UIAnimationView>,
		content: ViewClass,
	): ViewClass<UIAnimationView>;

	/**
	 * Creates a preset {@link UIConditionalView} constructor using the provided options
	 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class
	 * @param content The content that will be added to each instance of the resulting class
	 * @returns A new class that extends {@link UIConditionalView}
	 */
	conditional(
		preset: View.ExtendPreset<UIConditionalView>,
		content: ViewClass,
	): ViewClass<UIConditionalView>;

	/**
	 * Creates a preset {@link UIListView} constructor using the provided options
	 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class
	 * @param ItemBody The view that is instantiated for each item in the list
	 * @param ContainerBody The outer container view, defaults to a plain column
	 * @param BookEnd A view that is added to the end of the list (optional)
	 */
	list(
		preset: ui.PresetType<UIListView>,
		ItemBody: ViewClass,
		ContainerBody?: ViewClass<UIContainer>,
		BookEnd?: ViewClass,
	): ViewClass<UIListView>;

	/**
	 * Creates a preset {@link ViewComposite} constructor using the provided object and content
	 * @summary This method creates a constructor that extends the provided view composite class, providing its original constructor with the preset object containing properties, bindings, and event aliases; also overrides the {@link ViewComposite.defineView} method to pass in the specified content view(s), i.e. further preset view classes.
	 * @param viewComposite The view composite class to use
	 * @param preset Properties, bindings, and event aliases to preset on the view composite constructor
	 * @param content View class(es) to be contained within the view composite (if supported by its `defineView` method)
	 */
	use<TPreset extends {}, TInstance extends ViewComposite>(
		viewComposite: { new (preset?: TPreset): TInstance },
		preset: NoInfer<TPreset>,
		...content: ViewClass[]
	): typeof viewComposite;

	/**
	 * A function that returns a new UIColor instance for the specified theme color
	 * - Colors can be defined using {@link UITheme.colors}.
	 * @see {@link UIColor}
	 */
	color: {
		(name: string): UIColor;
		fg(onLight: UIColor | string, onDark: UIColor | string): UIColor;
		readonly CLEAR: UIColor;
		readonly BLACK: UIColor;
		readonly DARKER_GRAY: UIColor;
		readonly DARK_GRAY: UIColor;
		readonly GRAY: UIColor;
		readonly LIGHT_GRAY: UIColor;
		readonly WHITE: UIColor;
		readonly SLATE: UIColor;
		readonly LIGHT_SLATE: UIColor;
		readonly RED: UIColor;
		readonly ORANGE: UIColor;
		readonly YELLOW: UIColor;
		readonly LIME: UIColor;
		readonly GREEN: UIColor;
		readonly TURQUOISE: UIColor;
		readonly CYAN: UIColor;
		readonly BLUE: UIColor;
		readonly VIOLET: UIColor;
		readonly PURPLE: UIColor;
		readonly MAGENTA: UIColor;
		readonly SEPARATOR: UIColor;
		readonly CONTROL_BASE: UIColor;
		readonly BACKGROUND: UIColor;
		readonly TEXT: UIColor;
		readonly DANGER: UIColor;
		readonly DANGER_BG: UIColor;
		readonly SUCCESS: UIColor;
		readonly SUCCESS_BG: UIColor;
		readonly PRIMARY: UIColor;
		readonly PRIMARY_BG: UIColor;
		readonly ACCENT: UIColor;
		readonly ACCENT_BG: UIColor;
		readonly BRAND: UIColor;
		readonly BRAND_BG: UIColor;
	};

	/**
	 * A function that returns a new icon resource object for the specified icon
	 * - Icons can be defined using {@link UITheme.icons}.
	 * @see {@link UIIconResource}
	 */
	icon: {
		(name: string): UIIconResource;
		readonly BLANK: UIIconResource;
		readonly CLOSE: UIIconResource;
		readonly CHECK: UIIconResource;
		readonly MENU: UIIconResource;
		readonly MORE: UIIconResource;
		readonly PLUS: UIIconResource;
		readonly MINUS: UIIconResource;
		readonly CHEVRON_DOWN: UIIconResource;
		readonly CHEVRON_UP: UIIconResource;
		readonly CHEVRON_NEXT: UIIconResource;
		readonly CHEVRON_BACK: UIIconResource;
	};

	/**
	 * A function that returns an animation defined by the current theme
	 * - Animations can be defined using {@link UITheme.animations}.
	 * @see {@link RenderContext.OutputTransformer}
	 */
	animation: {
		(name: string): RenderContext.OutputTransformer;
		readonly FADE_IN: RenderContext.OutputTransformer;
		readonly FADE_OUT: RenderContext.OutputTransformer;
		readonly FADE_IN_UP: RenderContext.OutputTransformer;
		readonly FADE_IN_DOWN: RenderContext.OutputTransformer;
		readonly FADE_IN_LEFT: RenderContext.OutputTransformer;
		readonly FADE_IN_RIGHT: RenderContext.OutputTransformer;
		readonly FADE_OUT_UP: RenderContext.OutputTransformer;
		readonly FADE_OUT_DOWN: RenderContext.OutputTransformer;
		readonly FADE_OUT_LEFT: RenderContext.OutputTransformer;
		readonly FADE_OUT_RIGHT: RenderContext.OutputTransformer;
		readonly SHOW_DIALOG: RenderContext.OutputTransformer;
		readonly HIDE_DIALOG: RenderContext.OutputTransformer;
		readonly SHOW_MENU: RenderContext.OutputTransformer;
		readonly HIDE_MENU: RenderContext.OutputTransformer;
	};

	/**
	 * A function that returns a (cell) output effect defined by the current theme
	 * - Effects can be defined using {@link UITheme.effects}.
	 * @see {@link RenderContext.OutputEffect}
	 */
	effect: {
		(name: string): RenderContext.OutputEffect;
		readonly INSET: RenderContext.OutputEffect;
		readonly SHADOW: RenderContext.OutputEffect;
		readonly ELEVATE: RenderContext.OutputEffect;
	};

	/**
	 * A function that returns a new or existing style for the specified arguments
	 * - If called with a string, the base style is taken from the current theme. Styles for each class can be defined using {@link UITheme.styles}.
	 * - If called with a set of style types or overrides, all styles and overrides are applied in order. Note that a style type object will replace previous styles, while overrides will be merged with the previous styles.
	 * @see {@link UIStyle}
	 */
	style: {
		(name: string): UIStyle.Type<unknown>;
		<TDefinition>(
			...styles: Array<UIStyle.TypeOrOverrides<TDefinition> | undefined>
		): UIStyle.TypeOrOverrides<TDefinition>;
		readonly CELL: UIStyle.Type<UICell.StyleType>;
		readonly CELL_BG: UIStyle.Type<UICell.StyleType>;
		readonly LABEL: UIStyle.Type<UILabel.StyleType>;
		readonly LABEL_TITLE: UIStyle.Type<UILabel.StyleType>;
		readonly LABEL_SMALL: UIStyle.Type<UILabel.StyleType>;
		readonly LABEL_CLOSE: UIStyle.Type<UILabel.StyleType>;
		readonly BUTTON: UIStyle.Type<UIButton.StyleType>;
		readonly BUTTON_PRIMARY: UIStyle.Type<UIButton.StyleType>;
		readonly BUTTON_PLAIN: UIStyle.Type<UIButton.StyleType>;
		readonly BUTTON_SMALL: UIStyle.Type<UIButton.StyleType>;
		readonly BUTTON_ICON: UIStyle.Type<UIButton.StyleType>;
		readonly BUTTON_DANGER: UIStyle.Type<UIButton.StyleType>;
		readonly BUTTON_SUCCESS: UIStyle.Type<UIButton.StyleType>;
		readonly TEXTFIELD: UIStyle.Type<UITextField.StyleType>;
		readonly TOGGLE: UIStyle.Type<UIToggle.StyleType>;
		readonly TOGGLE_LABEL: UIStyle.Type<UILabel.StyleType>;
		readonly IMAGE: UIStyle.Type<UIImage.StyleType>;
	};
}
