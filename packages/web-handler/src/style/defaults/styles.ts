import { UIColor, UIRenderable, UIStyle, ui } from "@talla-ui/core";

type CombinedStyleType = UIRenderable.Dimensions &
	UIRenderable.Decoration &
	UIRenderable.TextStyle &
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
const _color_inherit = ui.color("inherit");

const baseButtonCss = {
	position: "relative",
	overflow: "hidden",
	cursor: "pointer",
	transition: "background 0.2s ease, border-color 0.2s ease",
};

const baseButtonStyle: CombinedStyleType = {
	padding: { y: 4, x: 12 },
	borderRadius: 14,
	borderThickness: 1,
	borderColor: _color_clear,
	fontWeight: 600,
	textAlign: "center",
	lineBreakMode: "ellipsis",
	lineHeight: 2,
	minWidth: 112,
	shrink: 1,
	css: baseButtonCss,
};

const baseLabelStyle: CombinedStyleType = {
	shrink: 1,
	maxWidth: "100%",
	lineBreakMode: "ellipsis",
	css: { cursor: "inherit" },
};

const baseBadgeLabelStyle: CombinedStyleType = {
	fontSize: 12,
	borderRadius: 6,
	padding: { x: 8, y: 2 },
	background: _color_text.alpha(0.1),
};

const disabledStyle: CombinedStyleType = {
	[UIStyle.STATE_DISABLED]: true,
	opacity: 0.5,
	css: { cursor: "default" },
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
			[UIStyle.STATE_HOVERED]: true,
			background: baseBg ? bg : bg.contrast(-0.05),
			textColor: fg,
		},
		{
			[UIStyle.STATE_PRESSED]: true,
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
	[
		"Button",
		makeButtonStyle(
			undefined,
			_color_text.alpha(0.15),
			_color_text,
			_color_text.alpha(0.1),
		),
	],
	["PrimaryButton", makeButtonStyle(undefined, ui.color.PRIMARY_BG)],
	["SuccessButton", makeButtonStyle(undefined, ui.color.SUCCESS_BG)],
	[
		"DangerButton",
		makeButtonStyle(
			undefined,
			ui.color.DANGER_BG,
			undefined,
			_color_text.alpha(0.15),
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
		"TextButton",
		makeButtonStyle(
			{
				minWidth: 0,
				padding: { y: 4 },
				borderRadius: 0,
				borderThickness: 0,
				textAlign: "start",
			},
			_color_clear,
			_color_inherit,
		),
	],
	[
		"LinkButton",
		makeButtonStyle(
			{
				minWidth: 0,
				padding: { y: 4 },
				borderRadius: 0,
				borderThickness: 0,
				textAlign: "start",
				underline: true,
			},
			_color_clear,
			ui.color.BLUE,
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
			_color_text.alpha(0.15),
			_color_text,
			_color_text.alpha(0.1),
		),
	],
	[
		"IconButton",
		makeButtonStyle(
			{
				minWidth: 32,
				minHeight: 32,
				padding: 4,
				borderRadius: 8,
				borderThickness: 0,
				lineHeight: 1,
				fontSize: "0",
			},
			_color_text.alpha(0.1),
			_color_inherit,
			_color_clear,
			_color_inherit,
		),
	],
	[
		"IconTopButton",
		makeButtonStyle(
			{
				css: {
					...baseButtonCss,
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					alignItems: "center",
				},
			},
			_color_text.alpha(0.1),
			_color_inherit,
		),
	],
	[
		"IconTopStartButton",
		makeButtonStyle(
			{
				css: {
					...baseButtonCss,
					display: "flex",
					flexDirection: "column",
					justifyContent: "start",
					alignItems: "start",
				},
			},
			_color_text.alpha(0.1),
			_color_inherit,
		),
	],
	[
		"IconTopEndButton",
		makeButtonStyle(
			{
				css: {
					...baseButtonCss,
					display: "flex",
					flexDirection: "column",
					justifyContent: "end",
					alignItems: "end",
				},
			},
			_color_text.alpha(0.1),
			_color_inherit,
		),
	],
	["Label", [baseLabelStyle]],
	["SmallLabel", [baseLabelStyle, { fontSize: 12 }]],
	["BadgeLabel", [baseLabelStyle, baseBadgeLabelStyle]],
	[
		"DangerBadgeLabel",
		[
			baseLabelStyle,
			baseBadgeLabelStyle,
			{
				background: ui.color.DANGER_BG.alpha(0.1),
				textColor: ui.color.DANGER,
			},
		],
	],
	[
		"SuccessBadgeLabel",
		[
			baseLabelStyle,
			baseBadgeLabelStyle,
			{
				background: ui.color.SUCCESS_BG.alpha(0.1),
				textColor: ui.color.SUCCESS,
			},
		],
	],
	[
		"Image",
		[
			{
				shrink: 1,
				maxWidth: "100%",
			},
		],
	],
	[
		"TextField",
		[
			{
				background: _color_bg,
				textColor: _color_text,
				borderThickness: 1,
				borderColor: _color_text.alpha(0.2),
				borderRadius: 5,
				minWidth: 96,
				shrink: 1,
				height: 36,
				padding: { x: 10, y: 4 },
				lineBreakMode: "pre-wrap",
				lineHeight: 1.5,
				userSelect: true,
				css: { cursor: "text" },
			},
			{
				[UIStyle.STATE_HOVERED]: true,
				[UIStyle.STATE_READONLY]: false,
				borderColor: _color_text.alpha(0.3),
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
				borderColor: _color_text.alpha(0.2),
				textColor: ui.color.PRIMARY_BG, // :checked fill
				padding: { y: 4 },
				shrink: 1,
				css: { cursor: "pointer" },
			},
			{
				[UIStyle.STATE_HOVERED]: true,
				borderColor: _color_text.alpha(0.3),
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
