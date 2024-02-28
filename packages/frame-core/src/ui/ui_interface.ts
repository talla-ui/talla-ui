import type { RenderContext, View, ViewClass } from "../app/index.js";
import type { BindingOrValue, LazyString } from "../base/index.js";
import { JSX } from "./JSX.js";
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
import type { UIForm } from "./containers/UIForm.js";
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
export const ui: Readonly<ui.GlobalType> = Object.assign(Object.create(null), {
	JSX,
}) as any;

export namespace ui {
	/**
	 * The type definition for the global {@link ui} object
	 */
	export interface GlobalType {
		/** A reference to the JSX transformation function, used by TypeScript */
		JSX: typeof JSX;

		/**
		 * Creates a preset {@link UICell} constructor using the provided options and content
		 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class (optional)
		 * @param content The content that will be added to each instance of the resulting class
		 * @returns A new class that extends {@link UICell}
		 */
		cell(
			preset: View.ViewPreset<UICell>,
			content?: ViewClass,
		): ViewClass<UICell>;
		cell(content: ViewClass): ViewClass<UICell>;

		/**
		 * Creates a preset {@link UIColumn} constructor using the provided options and content
		 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class (optional)
		 * @param content The content that will be added to each instance of the resulting class
		 * @returns A new class that extends {@link UIColumn}
		 */
		column(
			preset: View.ViewPreset<UIColumn>,
			...content: ViewClass[]
		): ViewClass<UIColumn>;
		column(...content: ViewClass[]): ViewClass<UIColumn>;

		/**
		 * Creates a preset {@link UIRow} constructor using the provided options and content
		 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class (optional)
		 * @param content The content that will be added to each instance of the resulting class
		 * @returns A new class that extends {@link UIRow}
		 */
		row(
			preset: View.ViewPreset<UIRow>,
			...content: ViewClass[]
		): ViewClass<UIRow>;
		row(...content: ViewClass[]): ViewClass<UIRow>;

		/**
		 * Creates a preset {@link UIForm} constructor using the provided options and content
		 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class (optional)
		 * @param content The content that will be added to each instance of the resulting class
		 * @returns A new class that extends {@link UIForm}
		 */
		form(
			preset: View.ViewPreset<UIForm>,
			...content: ViewClass[]
		): ViewClass<UIForm>;
		form(...content: ViewClass[]): ViewClass<UIForm>;

		/**
		 * Creates a preset {@link UIScrollContainer} constructor using the provided options and content
		 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class (optional)
		 * @param content The content that will be added to each instance of the resulting class
		 * @returns A new class that extends {@link UIScrollContainer}
		 */
		scroll(
			preset: View.ViewPreset<UIScrollContainer>,
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
			preset: View.ViewPreset<UIAnimatedCell>,
			content?: ViewClass,
		): ViewClass<UIAnimatedCell>;

		/**
		 * Creates a preset {@link UILabel} constructor using the provided options
		 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class
		 * @param text Preset label text
		 * @param style Preset label style (optional)
		 * @returns A new class that extends {@link UILabel}
		 */
		label(preset: View.ViewPreset<UILabel>): ViewClass<UILabel>;
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
		button(preset: View.ViewPreset<UIButton>): ViewClass<UIButton>;
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
		textField(preset: View.ViewPreset<UITextField>): ViewClass<UITextField>;

		/**
		 * Creates a preset {@link UIToggle} constructor using the provided options
		 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class
		 * @returns A new class that extends {@link UIToggle}
		 */
		toggle(preset: View.ViewPreset<UIToggle>): ViewClass<UIToggle>;

		/**
		 * Creates a preset {@link UISeparator} constructor using the provided options
		 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class
		 * @returns A new class that extends {@link UISeparator}
		 */
		separator(preset?: View.ViewPreset<UISeparator>): ViewClass<UISeparator>;

		/**
		 * Creates a preset {@link UISpacer} constructor using the provided options
		 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class
		 * @param width Preset spacer width
		 * @param height Preset spacer height
		 * @param minWidth Preset spacer minimum width
		 * @param minHeight Preset spacer minimum height
		 * @returns A new class that extends {@link UISpacer}
		 */
		spacer(preset: View.ViewPreset<UISpacer>): ViewClass<UISpacer>;
		spacer(
			width?: number | string,
			height?: number | string,
			minWidth?: number | string,
			minHeight?: number | string,
		): ViewClass<UISpacer>;

		/**
		 * Creates a preset {@link UIImage} constructor using the provided options
		 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class
		 * @param url Preset image URL
		 * @param style Preset image style (optional)
		 * @returns A new class that extends {@link UIImage}
		 */
		image(preset: View.ViewPreset<UIImage>): ViewClass<UIImage>;
		image(
			url: string,
			style?: UIStyle.TypeOrOverrides<UIImage.StyleType>,
		): ViewClass<UIImage>;

		/**
		 * Creates a preset {@link UIViewRenderer} constructor using the provided options
		 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class
		 * @returns A new class that extends {@link UIViewRenderer}
		 */
		renderView(
			preset: View.ViewPreset<UIViewRenderer>,
		): ViewClass<UIViewRenderer>;

		/**
		 * Creates a preset {@link UIAnimationView} constructor using the provided options
		 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class
		 * @param content The content that will be added to each instance of the resulting class
		 * @returns A new class that extends {@link UIAnimationView}
		 */
		animate(
			preset: View.ViewPreset<UIAnimationView>,
			content: ViewClass,
		): ViewClass<UIAnimationView>;

		/**
		 * Creates a preset {@link UIConditionalView} constructor using the provided options
		 * @param preset The properties, bindings, and event handlers that will be preset on each instance of the resulting class
		 * @param content The content that will be added to each instance of the resulting class
		 * @returns A new class that extends {@link UIConditionalView}
		 */
		conditional(
			preset: View.ViewPreset<UIConditionalView>,
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
			preset: View.ViewPreset<UIListView>,
			ItemBody: ViewClass,
			ContainerBody?: ViewClass<UIRow | UIColumn>,
			BookEnd?: ViewClass,
		): ViewClass<UIListView>;

		/**
		 * A function that returns a new UIColor instance for the specified theme color
		 * - Colors can be defined using {@link UITheme.colors}.
		 */
		color: {
			(name: string): UIColor;
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
		 * A function that returns a new UIIconResource instance for the specified icon
		 * - Icons can be defined using {@link UITheme.icons}.
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
		 */
		effect: {
			(name: string): RenderContext.OutputEffect;
			readonly INSET: RenderContext.OutputEffect;
			readonly SHADOW: RenderContext.OutputEffect;
			readonly ELEVATE: RenderContext.OutputEffect;
		};

		/**
		 * A function that returns a new or existing UIStyle (base) class for the specified style
		 * - Styles for each class can be defined using {@link UITheme.styles}.
		 */
		style: {
			(name: string): UIStyle.Type<any>;
			readonly CELL: UIStyle.Type<UICell.StyleType>;
			readonly CELL_BG: UIStyle.Type<UICell.StyleType>;
			readonly LABEL: UIStyle.Type<UILabel.StyleType>;
			readonly LABEL_TITLE: UIStyle.Type<UILabel.StyleType>;
			readonly LABEL_SMALL: UIStyle.Type<UILabel.StyleType>;
			readonly LABEL_CLOSE: UIStyle.Type<UILabel.StyleType>;
			readonly BUTTON: UIStyle.Type<UIButton.StyleType>;
			readonly BUTTON_PRIMARY: UIStyle.Type<UIButton.StyleType>;
			readonly BUTTON_PLAIN: UIStyle.Type<UIButton.StyleType>;
			readonly BUTTON_ICON: UIStyle.Type<UIButton.StyleType>;
			readonly TEXTFIELD: UIStyle.Type<UITextField.StyleType>;
			readonly TOGGLE: UIStyle.Type<UIToggle.StyleType>;
			readonly TOGGLE_LABEL: UIStyle.Type<UILabel.StyleType>;
			readonly IMAGE: UIStyle.Type<UIImage.StyleType>;
		};
	}
}
