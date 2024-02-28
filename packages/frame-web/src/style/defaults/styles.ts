import { UIComponent, UIStyle, ui } from "@desk-framework/frame-core";

type CombinedStyleType = UIComponent.DimensionsStyleType &
	UIComponent.DecorationStyleType &
	UIComponent.TextStyleType &
	UIStyle.StyleStateOptions;

/** @internal Defaults used for control text style */
export const defaultControlTextStyle: CombinedStyleType = {
	fontFamily:
		'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, "Helvetica Neue", Arial, sans-serif',
	fontSize: "0.875rem",
	lineHeight: "1.25",
};

const _color_clear = ui.color.CLEAR;
const _color_text = ui.color.TEXT;
const _color_primaryBackground = ui.color.PRIMARY_BG;
const _color_controlBase = ui.color.CONTROL_BASE;

const baseButtonStyle: CombinedStyleType = {
	padding: { y: 6, x: 12 },
	borderRadius: 12,
	borderThickness: 1,
	borderColor: _color_clear,
	background: _color_controlBase,
	textColor: _color_controlBase.text(),
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

const baseLabelStyle: CombinedStyleType = {
	padding: { y: 6 },
	maxWidth: "100%",
	lineHeight: 1,
	lineBreakMode: "ellipsis",
	css: { cursor: "inherit" },
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

/** @internal Default styles for `UITheme.styles` */
export const styles: [
	name: string,
	styles: UIStyle.StyleSelectorList<CombinedStyleType>,
][] = [
	[
		"BackgroundCell",
		[
			{
				background: ui.color.BACKGROUND,
				borderThickness: 1,
				borderColor: ui.color.BACKGROUND.fg(
					ui.color.TEXT.alpha(0.1),
					ui.color.TEXT.alpha(0.2),
				),
			},
		],
	],
	[
		"Button",
		[
			baseButtonStyle,
			{
				...hoveredNotDisabled,
				background: _color_controlBase.contrast(-0.1),
			},
			{
				...pressedNotDisabled,
				background: _color_controlBase.contrast(0.1),
			},
			disabledStyle,
		],
	],
	[
		"PrimaryButton",
		[
			{
				...baseButtonStyle,
				background: _color_primaryBackground,
				textColor: _color_primaryBackground.text(),
			},
			{
				...hoveredNotDisabled,
				background: _color_primaryBackground.contrast(0.2),
			},
			{
				...pressedNotDisabled,
				background: _color_primaryBackground.contrast(-0.1),
			},
			disabledStyle,
		],
	],
	[
		"PlainButton",
		[
			{
				...baseButtonStyle,
				background: _color_clear,
				textColor: _color_text,
				minWidth: 0,
			},
			{
				...hoveredNotDisabled,
				background: _color_controlBase,
			},
			{
				...pressedNotDisabled,
				background: _color_controlBase.contrast(-0.1),
			},
			disabledStyle,
		],
	],
	[
		"IconButton",
		[
			{
				minWidth: 32,
				minHeight: 32,
				padding: 4,
				shrink: 0,
				borderRadius: "50%",
				background: _color_clear,
				textColor: _color_text,
				lineHeight: 1,
				fontSize: "0",
				css: {
					cursor: "pointer",
					transition: "background 0.2s ease, border-color 0.2s ease",
				},
			},
			{
				...hoveredNotDisabled,
				background: _color_controlBase,
			},
			{
				...pressedNotDisabled,
				background: _color_controlBase.contrast(-0.1),
			},
			disabledStyle,
		],
	],
	[
		"Label",
		[
			{
				...baseLabelStyle,
				lineHeight: 1.5,
			},
		],
	],
	["SmallLabel", [{ ...baseLabelStyle, fontSize: "0.75em", lineHeight: 1.25 }]],
	["TitleLabel", [{ ...baseLabelStyle, fontSize: "1.75em", fontWeight: 600 }]],
	[
		"CloseLabel",
		[
			{
				...baseLabelStyle,
				padding: 0,
			},
		],
	],
	["Image", [{ maxWidth: "100%" }]],
	[
		"TextField",
		[
			{
				background: _color_clear,
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
				borderColor: _color_text.alpha(0.5),
				textColor: _color_primaryBackground, // :checked fill
				padding: { y: 4 },
				css: { cursor: "pointer" },
			},
			{
				...hoveredNotDisabled,
				borderColor: _color_text.alpha(0.75),
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
				padding: { y: 6, x: 8 },
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
