import {
	RenderContext,
	View,
	ViewClass,
	ViewComposite,
	app,
} from "../app/index.js";
import {
	UIAnimatedCell,
	UIAnimationView,
	UIButton,
	UICell,
	UIColor,
	UIColumn,
	UIConditionalView,
	UIContainer,
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
	extendPreset?: (preset: any, ...args: any) => any,
	init?: (this: TView, ...args: any) => void,
) {
	return function (...args: any[]) {
		let preset = isPreset(args[0]) ? args.shift() : undefined;
		if (extendPreset) extendPreset((preset ||= {}), ...args);
		return class PresetView extends (type as any) {
			constructor(...newArgs: any[]) {
				super(...newArgs);
				if (preset) this.applyViewPreset({ ...preset });
				if (init) init.call(this as any, ...(args as any));
			}
		} as any;
	};
}
const createContainerComponentFactory = (V: ViewClass<UIContainer>) =>
	createComponentFactory(V, undefined, function (...content: ViewClass[]) {
		for (let C of content) this.content.add(new C());
	});

// === Placement preset functions

_ui.page = function (content: ViewClass) {
	return _ui.mount({ page: true }, content);
};

_ui.screen = function (content: ViewClass) {
	return _ui.mount({ screen: true }, content);
};

_ui.mount = function (options: ui.MountPlacement, content: ViewClass) {
	let place: RenderContext.PlacementOptions | undefined =
		"page" in options && options.page
			? { mode: "page" }
			: "screen" in options && options.screen
				? { mode: "screen" }
				: "id" in options
					? { mode: "mount", mountId: options.id }
					: options.place || { mode: "none" };
	if (options.background) {
		place = { ...place, background: options.background };
	}
	return class PresetMount extends View {
		constructor() {
			super();
			let view = this.attach(new content(), (e) => {
				if (!e.noPropagation) this.emit(e);
			});
			this.render = view.render.bind(view);
			this.requestFocus = view.requestFocus.bind(view);
			this.findViewContent = view.findViewContent.bind(view);
			this.renderPlacement = place;
		}
		declare render;
		declare requestFocus;
		declare findViewContent;
	};
};

// === UI component factory functions

_ui.cell = createContainerComponentFactory(UICell);
_ui.column = createContainerComponentFactory(UIColumn);
_ui.row = createContainerComponentFactory(UIRow);
_ui.scroll = createContainerComponentFactory(UIScrollContainer);
_ui.animatedCell = createComponentFactory(UIAnimatedCell);

_ui.label = createComponentFactory(UILabel, (preset, text, style) => {
	if (text) preset.text = text;
	if (style) preset.style = style;
});

_ui.button = createComponentFactory(
	UIButton,
	(preset, label, onClick, style) => {
		if (label) preset.label = label;
		if (onClick) preset.onClick = onClick;
		if (style) preset.style = style;
	},
);

_ui.textField = createComponentFactory(UITextField);
_ui.toggle = createComponentFactory(UIToggle);
_ui.separator = createComponentFactory(UISeparator);
_ui.image = createComponentFactory(UIImage);
_ui.spacer = createComponentFactory(UISpacer, (preset, width, height) => {
	if (width) preset.width = width;
	if (height) preset.height = height;
});

_ui.renderView = createComponentFactory(UIViewRenderer, (view) => ({
	view,
}));
_ui.animate = createComponentFactory(UIAnimationView, (preset, C) => {
	preset.Body = C;
});
_ui.conditional = createComponentFactory(UIConditionalView, (preset, C) => {
	preset.Body = C;
});

const defaultListBody = ui.column({ accessibleRole: "list" });
_ui.list = createComponentFactory(
	UIListView,
	(preset, ItemBody, ContainerBody, BookEnd) => {
		preset.Body = ContainerBody || defaultListBody;
		preset.Observer = UIListView.createObserver(ItemBody, BookEnd);
	},
);

_ui.use = function <TPreset extends {}, TInstance extends ViewComposite>(
	viewComposite: { new (preset?: TPreset): TInstance },
	preset: NoInfer<TPreset>,
	...content: ViewClass[]
): typeof viewComposite {
	if (typeof preset === "function") {
		content.unshift(preset as any);
		preset = {} as any;
	}
	let C: ViewClass | undefined | void;
	return class PresetViewComposite extends (viewComposite as any) {
		constructor(p?: TPreset) {
			super(p ? { ...preset, ...p } : preset);
		}
		defineView() {
			return (C ||= super.defineView(...content));
		}
	} as any;
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
			async applyEffect(element, source) {
				app.theme?.effects.get(name)?.applyEffect(element, source);
			},
		};
		_effectCache.set(name, result);
	}
	return result;
} as any; // constants added below

_ui.style = function (...args: any[]) {
	let result:
		| UIStyle.Type<unknown>
		| UIStyle.StyleOverrides<unknown>
		| undefined;
	let overrides: any[] | undefined;
	for (let style of args) {
		if (!style) continue;
		if (typeof style === "string") {
			let name = style;
			style = _styleTypeCache.get(name);
			if (!result) {
				style = class BaseStyle extends UIStyle<any> {
					constructor() {
						super(name, BaseStyle);
					}
				};
				_styleTypeCache.set(name, style);
			}
		}
		if (
			(style as typeof UIStyle).isUIStyleType ||
			UIStyle.OVERRIDES_BASE in style
		) {
			result = style;
			overrides = undefined;
		} else {
			if (!overrides) overrides = [];
			overrides.push(style);
		}
	}
	if (!overrides) return result || {};
	if (!result) {
		return overrides.reduce((o, a) => Object.assign(o, a), {} as any);
	}
	return UIStyle.OVERRIDES_BASE in result
		? {
				[UIStyle.OVERRIDES_BASE]: result[UIStyle.OVERRIDES_BASE],
				overrides: [...result.overrides, ...overrides],
			}
		: result.extend(...overrides);
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
	LABEL: ui.style("Label"),
	LABEL_TITLE: ui.style("TitleLabel"),
	LABEL_SMALL: ui.style("SmallLabel"),
	LABEL_CLOSE: ui.style("CloseLabel"),
	BUTTON: ui.style("Button"),
	BUTTON_PRIMARY: ui.style("PrimaryButton"),
	BUTTON_PLAIN: ui.style("PlainButton"),
	BUTTON_SMALL: ui.style("SmallButton"),
	BUTTON_ICON: ui.style("IconButton"),
	BUTTON_DANGER: ui.style("DangerButton"),
	BUTTON_SUCCESS: ui.style("SuccessButton"),
	TEXTFIELD: ui.style("TextField"),
	TOGGLE: ui.style("Toggle"),
	TOGGLE_LABEL: ui.style("ToggleLabel"),
	IMAGE: ui.style("Image"),
});
Object.freeze(ui.style);

// freeze the entire ui object
Object.freeze(ui);
