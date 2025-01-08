import type {
	RenderContext,
	View,
	ViewBuilder,
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
	 * Type definition for a view builder preset object
	 * - This type is used to define the properties, bindings, and event handlers that can be passed to functions such as `ui.button(...)`.
	 */
	export type PresetType<TViewClass extends new () => View> =
		TViewClass extends {
			getViewBuilder(preset: infer P): ViewBuilder;
		}
			? P
			: never;

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
	 * Type definition for using {@link ui.jsx}
	 * @docgen {hide}
	 */
	export namespace JSX {
		export type Element = ViewBuilder;
		export interface IntrinsicElements {
			cell: ui.PresetType<typeof UICell>;
			column: ui.PresetType<typeof UIColumn>;
			row: ui.PresetType<typeof UIRow>;
			scroll: ui.PresetType<typeof UIScrollContainer>;
			animatedcell: ui.PresetType<typeof UIAnimatedCell>;
			label: ui.PresetType<typeof UILabel>;
			button: ui.PresetType<typeof UIButton>;
			textfield: ui.PresetType<typeof UITextField>;
			toggle: ui.PresetType<typeof UIToggle>;
			separator: ui.PresetType<typeof UISeparator>;
			spacer: ui.PresetType<typeof UISpacer>;
			image: ui.PresetType<typeof UIImage>;
			render: ui.PresetType<typeof UIViewRenderer>;
			animate: ui.PresetType<typeof UIAnimationView>;
			conditional: ui.PresetType<typeof UIConditionalView>;
			list: ui.PresetType<typeof UIListView>;
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
	jsx(f: string, presets: any, ...rest: any[]): ViewBuilder;

	/**
	 * Creates a {@link ViewBuilder} for a {@link UICell} with the provided options and content
	 * @param preset The properties, bindings, and event handlers that will be set on the view instance (optional)
	 * @param content The content that will be added to the view instance
	 * @returns A ViewBuilder that creates {@link UICell} instances
	 */
	cell(
		preset: ui.PresetType<typeof UICell>,
		...content: ViewBuilder[]
	): ViewBuilder<UICell>;
	cell(...content: ViewBuilder[]): ViewBuilder<UICell>;

	/**
	 * Creates a {@link ViewBuilder} for a {@link UIColumn} with the provided options and content
	 * @param preset The properties, bindings, and event handlers that will be set on the view instance (optional)
	 * @param content The content that will be added to the view instance
	 * @returns A ViewBuilder that creates {@link UIColumn} instances
	 */
	column(
		preset: ui.PresetType<typeof UIColumn>,
		...content: ViewBuilder[]
	): ViewBuilder<UIColumn>;
	column(...content: ViewBuilder[]): ViewBuilder<UIColumn>;

	/**
	 * Creates a {@link ViewBuilder} for a {@link UIRow} with the provided options and content
	 * @param preset The properties, bindings, and event handlers that will be set on the view instance (optional)
	 * @param content The content that will be added to the view instance
	 * @returns A ViewBuilder that creates {@link UIRow} instances
	 */
	row(
		preset: ui.PresetType<typeof UIRow>,
		...content: ViewBuilder[]
	): ViewBuilder<UIRow>;
	row(...content: ViewBuilder[]): ViewBuilder<UIRow>;

	/**
	 * Creates a {@link ViewBuilder} for a {@link UIScrollContainer} with the provided options and content
	 * @param preset The properties, bindings, and event handlers that will be set on the view instance (optional)
	 * @param content The content that will be added to the view instance
	 * @returns A ViewBuilder that creates {@link UIScrollContainer} instances
	 */
	scroll(
		preset: ui.PresetType<typeof UIScrollContainer>,
		...content: ViewBuilder[]
	): ViewBuilder<UIScrollContainer>;
	scroll(...content: ViewBuilder[]): ViewBuilder<UIScrollContainer>;

	/**
	 * Creates a {@link ViewBuilder} for a {@link UIAnimatedCell} with the provided options and content
	 * @param preset The properties, bindings, and event handlers that will be set on the view instance
	 * @param content The content that will be added to the view instance
	 * @returns A ViewBuilder that creates {@link UIAnimatedCell} instances
	 */
	animatedCell(
		preset: ui.PresetType<typeof UIAnimatedCell>,
		...content: ViewBuilder[]
	): ViewBuilder<UIAnimatedCell>;
	animatedCell(...content: ViewBuilder[]): ViewBuilder<UICell>;

	/**
	 * Creates a {@link ViewBuilder} for a {@link UILabel} with the provided options
	 * @param text The label text to be set on the view instance
	 * @param preset The properties, bindings, and event handlers that will be set on the view instance
	 * @returns A ViewBuilder that creates {@link UILabel} instances
	 */
	label(
		text: BindingOrValue<string | LazyString>,
		preset?: ui.PresetType<typeof UILabel>,
	): ViewBuilder<UILabel>;
	label(preset: ui.PresetType<typeof UILabel>): ViewBuilder<UILabel>;

	/**
	 * Creates a {@link ViewBuilder} for a {@link UIButton} with the provided options
	 * @param label The button label text to be set on the view instance
	 * @param preset The properties, bindings, and event handlers that will be set on the view instance
	 * @returns A ViewBuilder that creates {@link UIButton} instances
	 */
	button(
		label: BindingOrValue<string | LazyString>,
		preset?: ui.PresetType<typeof UIButton>,
	): ViewBuilder<UIButton>;
	button(preset: ui.PresetType<typeof UIButton>): ViewBuilder<UIButton>;

	/**
	 * Creates a {@link ViewBuilder} for a {@link UITextField} with the provided options
	 * @param preset The properties, bindings, and event handlers that will be set on the view instance
	 * @returns A ViewBuilder that creates {@link UITextField} instances
	 */
	textField(
		preset: ui.PresetType<typeof UITextField>,
	): ViewBuilder<UITextField>;

	/**
	 * Creates a {@link ViewBuilder} for a {@link UIToggle} with the provided options
	 * @param preset The properties, bindings, and event handlers that will be set on the view instance
	 * @returns A ViewBuilder that creates {@link UIToggle} instances
	 */
	toggle(preset: ui.PresetType<typeof UIToggle>): ViewBuilder<UIToggle>;

	/**
	 * Creates a {@link ViewBuilder} for a {@link UISeparator} with the provided options
	 * @param preset The properties, bindings, and event handlers that will be set on the view instance
	 * @returns A ViewBuilder that creates {@link UISeparator} instances
	 */
	separator(
		preset?: ui.PresetType<typeof UISeparator>,
	): ViewBuilder<UISeparator>;

	/**
	 * Creates a {@link ViewBuilder} for a {@link UISpacer} with the provided options
	 * @param preset The properties, bindings, and event handlers that will be set on the view instance
	 * @param width The width to be set on the view instance
	 * @param height The height to be set on the view instance
	 * @returns A ViewBuilder that creates {@link UISpacer} instances
	 */
	spacer(preset: ui.PresetType<typeof UISpacer>): ViewBuilder<UISpacer>;
	spacer(
		width?: number | string,
		height?: number | string,
	): ViewBuilder<UISpacer>;

	/**
	 * Creates a {@link ViewBuilder} for a {@link UIImage} with the provided options
	 * @param preset The properties, bindings, and event handlers that will be set on the view instance
	 * @returns A ViewBuilder that creates {@link UIImage} instances
	 */
	image(preset: ui.PresetType<typeof UIImage>): ViewBuilder<UIImage>;

	/**
	 * Creates a {@link ViewBuilder} for a {@link UIViewRenderer} with the provided options
	 * @param preset The properties, bindings, and event handlers that will be set on the view instance
	 * @returns A ViewBuilder that creates {@link UIViewRenderer} instances
	 */
	renderView(
		preset: ui.PresetType<typeof UIViewRenderer>,
	): ViewBuilder<UIViewRenderer>;

	/**
	 * Creates a {@link ViewBuilder} for a {@link UIAnimationView} with the provided options
	 * @param preset The properties, bindings, and event handlers that will be set on the view instance
	 * @param content The content that will be added to the view instance
	 * @returns A ViewBuilder that creates {@link UIAnimationView} instances
	 */
	animate(
		preset: ui.PresetType<typeof UIAnimationView>,
		content: ViewBuilder,
	): ViewBuilder<UIAnimationView>;

	/**
	 * Creates a {@link ViewBuilder} for a {@link UIConditionalView} with the provided options
	 * @param preset The properties, bindings, and event handlers that will be set on the view instance
	 * @param content The content that will be added to the view instance
	 * @returns A ViewBuilder that creates {@link UIConditionalView} instances
	 */
	conditional(
		preset: ui.PresetType<typeof UIConditionalView>,
		content: ViewBuilder,
	): ViewBuilder<UIConditionalView>;

	/**
	 * Creates a {@link ViewBuilder} for a {@link UIListView} with the provided options
	 * @param preset The properties, bindings, and event handlers that will be set on the view instance
	 * @param itemBody A view builder that creates views for each item in the list
	 * @param containerBody A view builder that creates the outer container view
	 * @param bookEnd A view builder that creates a view added to the end of the list
	 * @returns A ViewBuilder that creates {@link UIListView} instances
	 */
	list(
		preset: ui.PresetType<typeof UIListView>,
		itemBody: ViewBuilder,
		containerBody?: ViewBuilder<UIContainer>,
		bookEnd?: ViewBuilder,
	): ViewBuilder<UIListView>;

	/**
	 * Creates a new view builder for the specified view class
	 * - This function is used to create a new view builder for a specific view class, in particular for a {@link ViewComposite} class. The view builder can be used to create new view instances with preset properties, bindings, and event handlers, as well as any content based on the provided view builders.
	 * - The type of preset object is inferred from the view class, and the type of the view builder is inferred from the view class's instance type.
	 * @param viewClass The view class for which to create a new view builder
	 * @param preset The preset properties, bindings, and event handlers for the view instance
	 * @param content View builders for any content that should be added to the view
	 */
	use<TPreset extends {}, TInstance extends View>(
		viewClass: {
			getViewBuilder(
				preset?: TPreset,
				...content: ViewBuilder[]
			): ViewBuilder<TInstance>;
		},
		preset: NoInfer<TPreset>,
		...content: ViewBuilder[]
	): ViewBuilder<TInstance>;
	use<TInstance extends View>(
		viewClass: {
			getViewBuilder(
				preset?: {},
				...content: ViewBuilder[]
			): ViewBuilder<TInstance>;
		},
		...content: ViewBuilder[]
	): ViewBuilder<TInstance>;

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
		readonly SEARCH: UIIconResource;
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
