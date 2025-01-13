import { UIColor, UIComponent, UIStyle, ui } from "@talla-ui/core";

type CombinedStyleType = UIComponent.Dimensions &
	UIComponent.Decoration &
	UIComponent.TextStyle &
	UIStyle.StyleStateOptions;

/** @internal Defaults used for control text style */
export const defaultControlTextStyle: CombinedStyleType = {
	fontFamily:
		'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, "Helvetica Neue", Arial, sans-serif',
	fontSize: 14,
	lineHeight: 1.5,
};

const _color_bg = ui.color.BACKGROUND;
const _color_clear = ui.color.CLEAR;
const _color_text = ui.color.TEXT;
const _color_controlBase = ui.color.CONTROL_BASE;
const _color_inherit = ui.color("inherit");

const baseButtonStyle: CombinedStyleType = {
	padding: { y: 6, x: 12 },
	borderRadius: 12,
	borderThickness: 1,
	borderColor: _color_clear,
	fontWeight: 600,
	textAlign: "center",
	lineBreakMode: "ellipsis",
	lineHeight: 2,
	minWidth: 112,
	shrink: 0,
	css: {
		position: "relative",
		overflow: "hidden",
		cursor: "pointer",
		transition: "background 0.1s ease, border-color 0.1s ease",
	},
};

const disabledStyle: CombinedStyleType = {
	[UIStyle.STATE_DISABLED]: true,
	opacity: 0.5,
	css: { cursor: "default" },
};

const hoveredNotDisabled: CombinedStyleType = {
	[UIStyle.STATE_HOVERED]: true,
	[UIStyle.STATE_DISABLED]: false,
};

const pressedNotDisabled: CombinedStyleType = {
	[UIStyle.STATE_PRESSED]: true,
	[UIStyle.STATE_DISABLED]: false,
};

function makeButtonStyle(
	styles: CombinedStyleType | undefined,
	bg: UIColor,
	fg = bg.text(),
	baseBg?: UIColor,
	baseFg?: UIColor,
) {
	return [
		{
			...baseButtonStyle,
			background: baseBg || bg,
			textColor: baseFg || fg,
			...styles,
		},
		{
			...hoveredNotDisabled,
			background: baseBg ? bg : bg.contrast(-0.05),
			textColor: fg,
		},
		{
			...pressedNotDisabled,
			background: bg.contrast(-0.1),
			textColor: fg,
		},
		disabledStyle,
	];
}

/** @internal Default styles for `UITheme.styles` */
export const styles: [
	name: string,
	styles: UIStyle.StyleSelectorList<CombinedStyleType>,
][] = [
	[
		"BackgroundCell",
		[
			{
				background: _color_bg,
				borderThickness: 1,
				borderColor: _color_bg.fg(
					ui.color.TEXT.alpha(0.1),
					ui.color.TEXT.alpha(0.2),
				),
			},
		],
	],
	["Button", makeButtonStyle(undefined, _color_controlBase)],
	["PrimaryButton", makeButtonStyle(undefined, ui.color.PRIMARY_BG)],
	["SuccessButton", makeButtonStyle(undefined, ui.color.SUCCESS_BG)],
	[
		"DangerButton",
		makeButtonStyle(
			undefined,
			ui.color.DANGER_BG,
			undefined,
			_color_controlBase,
			ui.color.DANGER,
		),
	],
	[
		"PlainButton",
		makeButtonStyle(
			{ minWidth: 0 },
			_color_text.alpha(0.1),
			_color_inherit,
			_color_clear,
			_color_inherit,
		),
	],
	[
		"SmallButton",
		makeButtonStyle(
			{
				fontSize: 12,
				padding: { x: 8, y: 1 },
				minWidth: 88,
				borderRadius: 8,
			},
			_color_controlBase,
		),
	],
	[
		"IconButton",
		makeButtonStyle(
			{
				minWidth: 32,
				minHeight: 32,
				padding: 4,
				shrink: 0,
				borderRadius: 8,
				borderThickness: 0,
				lineHeight: 1,
				fontSize: "0",
				css: {
					cursor: "pointer",
					transition: "background 0.2s ease, border-color 0.2s ease",
				},
			},
			_color_text.alpha(0.1),
			_color_inherit,
			_color_clear,
			_color_inherit,
		),
	],
	[
		"Label",
		[
			{
				maxWidth: "100%",
				lineBreakMode: "ellipsis",
				css: { cursor: "inherit" },
			},
		],
	],
	["Image", [{ maxWidth: "100%" }]],
	[
		"TextField",
		[
			{
				background: _color_bg,
				textColor: _color_text,
				borderThickness: 1,
				borderColor: _color_text.alpha(0.25),
				borderRadius: 5,
				minWidth: 96,
				padding: 8,
				lineBreakMode: "pre-wrap",
				lineHeight: 1.5,
				userSelect: true,
				css: { cursor: "text" },
			},
			{
				...hoveredNotDisabled,
				[UIStyle.STATE_READONLY]: false,
				borderColor: _color_text.alpha(0.5),
			},
			{
				[UIStyle.STATE_READONLY]: true,
				background: _color_text.alpha(0.1),
				borderColor: _color_clear,
			},
			disabledStyle,
		],
	],
	[
		"Toggle",
		[
			{
				borderColor: _color_text.alpha(0.25),
				textColor: ui.color.PRIMARY_BG, // :checked fill
				padding: { y: 4 },
				css: { cursor: "pointer" },
			},
			{
				...hoveredNotDisabled,
				borderColor: _color_text.alpha(0.5),
			},
			disabledStyle,
		],
	],
	[
		"ToggleLabel",
		[
			{
				textColor: _color_text, // (don't inherit :checked fill)
				lineBreakMode: "pre-wrap",
				lineHeight: 1.5,
				padding: { y: 6 },
				css: { display: "inline" },
			},
		],
	],
];

// freeze all reused styles above so they can't be modified
for (let entry of styles) {
	for (let object of entry[1]) {
		Object.freeze(object);
	}
}
