import { RenderContext, View, ViewBuilder, app } from "../app/index.js";
import {
	UIAnimatedCell,
	UIAnimationView,
	UIButton,
	UICell,
	UIColor,
	UIColumn,
	UIConditionalView,
	UIIconResource,
	UIImage,
	UILabel,
	UIListView,
	UIRow,
	UIScrollContainer,
	UISeparator,
	UISpacer,
	UIStyle,
	UITextField,
	UIToggle,
	UIViewRenderer,
	ui,
} from "./index.js";
import { jsx } from "./jsx.js";

// Use a separate non-readonly variable to store the object first
const _ui: ui = ui;
_ui.jsx = jsx;

// memoize result objects by name
const _colorCache = new Map<string, UIColor>();
const _iconCache = new Map<string, UIIconResource>();
const _animationCache = new Map<string, RenderContext.OutputTransformer>();
const _effectCache = new Map<string, RenderContext.OutputEffect>();
const _themeStyles = new Map<string, UIStyle<unknown>>();

/** Helper function to determine if a value is a plain object, i.e. { ... } */
function isPreset(value: any) {
	if (value && typeof value.create !== "function") {
		let proto = Object.getPrototypeOf(value);
		return proto === Object.prototype || proto === null;
	}
}

/** Helper function for ui.* functions */
function makeAnyViewBuilderFunction(type: typeof View) {
	return function (...args: any[]): ViewBuilder<any> {
		if (!isPreset(args[0])) args.unshift(Object.create(null));
		return (type.getViewBuilder as any).call(type, ...args);
	};
}

/** Helper function for ui.* functions */
function makeNonPresetViewBuilderFunction(
	type: typeof View,
	makePreset: (...args: any[]) => any,
) {
	return function (...args: any[]): ViewBuilder<any> {
		return (type.getViewBuilder as any).call(
			type,
			!isPreset(args[0]) ? makePreset(...args) : args[0],
		);
	};
}

// === view builder functions

_ui.cell = makeAnyViewBuilderFunction(UICell);
_ui.column = makeAnyViewBuilderFunction(UIColumn);
_ui.row = makeAnyViewBuilderFunction(UIRow);
_ui.scroll = makeAnyViewBuilderFunction(UIScrollContainer);
_ui.animatedCell = makeAnyViewBuilderFunction(UIAnimatedCell);

_ui.label = makeNonPresetViewBuilderFunction(UILabel, (text, p) => ({
	...p,
	text,
}));
_ui.button = makeNonPresetViewBuilderFunction(UIButton, (label, p) => ({
	...p,
	label,
}));
_ui.textField = makeAnyViewBuilderFunction(UITextField);
_ui.toggle = makeAnyViewBuilderFunction(UIToggle);
_ui.separator = makeAnyViewBuilderFunction(UISeparator);
_ui.image = makeAnyViewBuilderFunction(UIImage);
_ui.spacer = makeNonPresetViewBuilderFunction(UISpacer, (width, height) => ({
	width,
	height,
}));

_ui.renderView = makeAnyViewBuilderFunction(UIViewRenderer);
_ui.animate = makeAnyViewBuilderFunction(UIAnimationView);
_ui.conditional = makeAnyViewBuilderFunction(UIConditionalView);
_ui.list = makeAnyViewBuilderFunction(UIListView);

_ui.use = function (type: any, ...args: any[]) {
	if (!isPreset(args[0])) args.unshift(Object.create(null));
	return type.getViewBuilder.apply(type, args);
};

// === Other factory functions

_ui.color = function (name: string) {
	let result = _colorCache.get(name);
	if (!result) {
		result = new UIColor(name);
		_colorCache.set(name, result);
	}
	return result;
} as any; // constants added below

_ui.icon = function (name: string) {
	let result = _iconCache.get(name);
	if (!result) {
		result = new UIIconResource(name);
		_iconCache.set(name, result);
	}
	return result;
} as any; // constants added below

_ui.animation = function (name: string) {
	let result = _animationCache.get(name);
	if (!result) {
		result = {
			async applyTransform(transform) {
				return app.theme?.animations.get(name)?.applyTransform(transform);
			},
		};
		_animationCache.set(name, result);
	}
	return result;
} as any; // constants added below

_ui.effect = function (name: string) {
	let result = _effectCache.get(name);
	if (!result) {
		result = {
			applyEffect(element, source) {
				app.theme?.effects.get(name)?.applyEffect(element, source);
			},
			removeEffect(element, source) {
				app.theme?.effects.get(name)?.removeEffect?.(element, source);
			},
		};
		_effectCache.set(name, result);
	}
	return result;
} as any; // constants added below

_ui.style = function (...args: any[]) {
	let result: UIStyle<unknown> | undefined;
	let overrides: any[] | undefined;
	for (let style of args) {
		if (!style) continue;
		if (typeof style === "string") {
			if (_themeStyles.has(style)) {
				style = _themeStyles.get(style);
			} else {
				style = new UIStyle(style);
				_themeStyles.set(style.id, style);
			}
		}
		if (style instanceof UIStyle) {
			result = style;
			overrides = undefined;
		} else {
			(overrides ||= []).push(style);
		}
	}
	if (result) {
		return overrides ? result.override(...overrides) : result;
	}
	return overrides ? Object.assign({}, ...overrides) : {};
} as any; // base styles added below

// add color constants to ui.color function
Object.assign(ui.color, {
	fg: UIColor.prototype.fg.bind(ui.color("Background")),
	CLEAR: new UIColor(),
	BLACK: ui.color("Black"),
	DARKER_GRAY: ui.color("DarkerGray"),
	DARK_GRAY: ui.color("DarkGray"),
	GRAY: ui.color("Gray"),
	LIGHT_GRAY: ui.color("LightGray"),
	WHITE: ui.color("White"),
	SLATE: ui.color("Slate"),
	LIGHT_SLATE: ui.color("LightSlate"),
	RED: ui.color("Red"),
	ORANGE: ui.color("Orange"),
	YELLOW: ui.color("Yellow"),
	LIME: ui.color("Lime"),
	GREEN: ui.color("Green"),
	TURQUOISE: ui.color("Turquoise"),
	CYAN: ui.color("Cyan"),
	BLUE: ui.color("Blue"),
	VIOLET: ui.color("Violet"),
	PURPLE: ui.color("Purple"),
	MAGENTA: ui.color("Magenta"),
	SEPARATOR: ui.color("Separator"),
	CONTROL_BASE: ui.color("ControlBase"),
	BACKGROUND: ui.color("Background"),
	TEXT: ui.color("Text"),
	DANGER: ui.color("Danger"),
	DANGER_BG: ui.color("DangerBackground"),
	SUCCESS: ui.color("Success"),
	SUCCESS_BG: ui.color("SuccessBackground"),
	PRIMARY: ui.color("Primary"),
	PRIMARY_BG: ui.color("PrimaryBackground"),
	BRAND: ui.color("Brand"),
	BRAND_BG: ui.color("BrandBackground"),
});
Object.freeze(ui.color);

// add icon constants to ui.icon function
Object.assign(ui.icon, {
	BLANK: ui.icon("Blank"),
	CLOSE: ui.icon("Close"),
	CHECK: ui.icon("Check"),
	MENU: ui.icon("Menu"),
	MORE: ui.icon("More"),
	SEARCH: ui.icon("Search"),
	PLUS: ui.icon("Plus"),
	MINUS: ui.icon("Minus"),
	CHEVRON_DOWN: ui.icon("ChevronDown"),
	CHEVRON_UP: ui.icon("ChevronUp"),
	CHEVRON_NEXT: ui.icon("ChevronNext"),
	CHEVRON_BACK: ui.icon("ChevronBack"),
});
Object.freeze(ui.icon);

// add animation constants to ui.animation function
Object.assign(ui.animation, {
	FADE_IN: ui.animation("FadeIn"),
	FADE_OUT: ui.animation("FadeOut"),
	FADE_IN_UP: ui.animation("FadeInUp"),
	FADE_IN_DOWN: ui.animation("FadeInDown"),
	FADE_IN_LEFT: ui.animation("FadeInLeft"),
	FADE_IN_RIGHT: ui.animation("FadeInRight"),
	FADE_OUT_UP: ui.animation("FadeOutUp"),
	FADE_OUT_DOWN: ui.animation("FadeOutDown"),
	FADE_OUT_LEFT: ui.animation("FadeOutLeft"),
	FADE_OUT_RIGHT: ui.animation("FadeOutRight"),
	SHOW_DIALOG: ui.animation("ShowDialog"),
	HIDE_DIALOG: ui.animation("HideDialog"),
	SHOW_MENU: ui.animation("ShowMenu"),
	HIDE_MENU: ui.animation("HideMenu"),
});
Object.freeze(ui.animation);

// add effect constants to ui.effect function
Object.assign(ui.effect, {
	INSET: ui.effect("Inset"),
	SHADOW: ui.effect("Shadow"),
	ELEVATE: ui.effect("Elevate"),
});
Object.freeze(ui.effect);

// add base styles to ui.style
Object.assign(_ui.style, {
	CELL: ui.style("Cell"),
	CELL_BG: ui.style("BackgroundCell"),
	BUTTON: ui.style("Button"),
	BUTTON_PRIMARY: ui.style("PrimaryButton"),
	BUTTON_PLAIN: ui.style("PlainButton"),
	BUTTON_SMALL: ui.style("SmallButton"),
	BUTTON_ICON: ui.style("IconButton"),
	BUTTON_DANGER: ui.style("DangerButton"),
	BUTTON_SUCCESS: ui.style("SuccessButton"),
	LABEL: ui.style("Label"),
	TEXTFIELD: ui.style("TextField"),
	TOGGLE: ui.style("Toggle"),
	TOGGLE_LABEL: ui.style("ToggleLabel"),
	IMAGE: ui.style("Image"),
});
Object.freeze(ui.style);

// freeze the entire ui object
Object.freeze(ui);
