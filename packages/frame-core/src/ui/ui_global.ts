import { RenderContext, View, ViewClass, app } from "../app/index.js";
import { UIColor } from "./UIColor.js";
import { UIIconResource } from "./UIIconResource.js";
import { UIStyle } from "./UIStyle.js";
import { UIAnimationView } from "./composites/UIAnimationView.js";
import { UIConditionalView } from "./composites/UIConditionalView.js";
import { UIListView } from "./composites/UIListView.js";
import { UIViewRenderer } from "./composites/UIViewRenderer.js";
import { UIAnimatedCell, UICell } from "./containers/UICell.js";
import { UIColumn } from "./containers/UIColumn.js";
import { UIContainer } from "./containers/UIContainer.js";
import { UIForm } from "./containers/UIForm.js";
import { UIRow } from "./containers/UIRow.js";
import { UIScrollContainer } from "./containers/UIScrollContainer.js";
import { UIButton } from "./controls/UIButton.js";
import { UIImage } from "./controls/UIImage.js";
import { UILabel } from "./controls/UILabel.js";
import { UISeparator } from "./controls/UISeparator.js";
import { UISpacer } from "./controls/UISpacer.js";
import { UITextField } from "./controls/UITextField.js";
import { UIToggle } from "./controls/UIToggle.js";
import { ui } from "./ui_interface.js";

// Use a separate non-readonly variable to store the object first
const _ui: ui.GlobalType = ui as any;

// memoize result objects by name
const _colorCache = new Map<string, UIColor>();
const _iconCache = new Map<string, UIIconResource>();
const _animationCache = new Map<string, RenderContext.OutputTransformer>();
const _effectCache = new Map<string, RenderContext.OutputEffect>();
const _styleTypeCache = new Map<string, UIStyle.Type<any>>();

/** Helper function to determine if a value is a plain object, i.e. { ... } */
function isPreset(value: any) {
	if (value) {
		let proto = Object.getPrototypeOf(value);
		return proto === Object.prototype || proto === null;
	}
}

/** UI component factory helper function */
function createComponentFactory<TView extends View>(
	type: new () => TView,
	init?: (this: TView, ...args: any) => void,
	makePreset?: (...args: any) => any,
	extendPreset?: (preset: any, ...args: any) => any,
) {
	return function (...args: any[]) {
		let preset = isPreset(args[0]) ? args.shift() : makePreset?.(...args) || {};
		if (extendPreset) extendPreset(preset, ...args);
		return class PresetView extends (type as any) {
			constructor(...newArgs: any[]) {
				super(...newArgs);
				this.applyViewPreset({ ...preset });
				init?.call(this as any, ...(args as any));
			}
		} as any;
	};
}

// === UI component factory functions

const createContainerComponentFactory = (V: ViewClass<UIContainer>) =>
	createComponentFactory(V, function (...content: ViewClass[]) {
		for (let C of content) this.content.add(new C());
	});
_ui.cell = createContainerComponentFactory(UICell);
_ui.column = createContainerComponentFactory(UIColumn);
_ui.row = createContainerComponentFactory(UIRow);
_ui.form = createContainerComponentFactory(UIForm);
_ui.scroll = createContainerComponentFactory(UIScrollContainer);
_ui.animatedCell = createComponentFactory(UIAnimatedCell);

_ui.label = createComponentFactory(UILabel, undefined, (text, style) => ({
	text,
	style,
}));

_ui.button = createComponentFactory(
	UIButton,
	undefined,
	(label, onClick, style) => ({
		label,
		onClick,
		style,
	}),
);

_ui.textField = createComponentFactory(UITextField);
_ui.toggle = createComponentFactory(UIToggle);
_ui.separator = createComponentFactory(UISeparator);

_ui.spacer = createComponentFactory(
	UISpacer,
	undefined,
	(width, height, minWidth, minHeight) => ({
		width,
		height,
		minWidth,
		minHeight,
	}),
);

_ui.image = createComponentFactory(UIImage, undefined, (url, style) => ({
	url,
	style,
}));

_ui.renderView = createComponentFactory(UIViewRenderer);
_ui.animate = createComponentFactory(
	UIAnimationView,
	undefined,
	undefined,
	(preset, C) => {
		preset.Body = C;
	},
);
_ui.conditional = createComponentFactory(
	UIConditionalView,
	undefined,
	undefined,
	(preset, C) => {
		preset.Body = C;
	},
);

const defaultListBody = ui.column({ accessibleRole: "list" });
_ui.list = createComponentFactory(
	UIListView,
	undefined,
	undefined,
	(preset, ItemBody, ContainerBody, BookEnd) => {
		preset.Body = ContainerBody || defaultListBody;
		preset.Observer = UIListView.createObserver(ItemBody, BookEnd);
	},
);

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
			async applyEffect(element, source) {
				app.theme?.effects.get(name)?.applyEffect(element, source);
			},
		};
		_effectCache.set(name, result);
	}
	return result;
} as any; // constants added below

_ui.style = function (name: string) {
	let result = _styleTypeCache.get(name);
	if (!result) {
		result = class BaseStyle extends UIStyle<any> {
			constructor() {
				super(name, BaseStyle);
			}
		};
		_styleTypeCache.set(name, result);
	}
	return result;
} as any; // base styles added below

// add color constants to ui.color function
Object.assign(ui.color, {
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
	ACCENT: ui.color("Accent"),
	ACCENT_BG: ui.color("AccentBackground"),
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
	LABEL: ui.style("Label"),
	LABEL_TITLE: ui.style("TitleLabel"),
	LABEL_SMALL: ui.style("SmallLabel"),
	LABEL_CLOSE: ui.style("CloseLabel"),
	BUTTON: ui.style("Button"),
	BUTTON_PRIMARY: ui.style("PrimaryButton"),
	BUTTON_PLAIN: ui.style("PlainButton"),
	BUTTON_ICON: ui.style("IconButton"),
	TEXTFIELD: ui.style("TextField"),
	TOGGLE: ui.style("Toggle"),
	TOGGLE_LABEL: ui.style("ToggleLabel"),
	IMAGE: ui.style("Image"),
});
Object.freeze(ui.style);

// freeze the entire ui object
Object.freeze(ui);
