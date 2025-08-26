import { UI, UIColor, UIStyle } from "@talla-ui/core";

const color_inherit = new UIColor("inherit");
const colors = UI.colors;
const color_transparent = colors.transparent;
const color_text = colors.text;
const color_background = colors.background;
const color_primaryBackground = colors.primaryBackground;
const color_successBackground = colors.successBackground;
const color_dangerBackground = colors.dangerBackground;
const color_success = colors.success;
const color_danger = colors.danger;
const color_link = colors.link;

const baseButtonCss = {
	position: "relative",
	overflow: "hidden",
	transition: "background 0.2s ease, border-color 0.2s ease",
};

const baseButtonStyle: UIStyle.StyleOptions = {
	padding: { y: 2, x: 12 },
	borderRadius: 14,
	borderWidth: 1,
	borderColor: color_transparent,
	fontWeight: 600,
	textAlign: "center",
	lineBreakMode: "nowrap",
	lineHeight: 2,
	minWidth: 104,
	shrink: 1,
	cursor: "pointer",
	css: baseButtonCss,
};

const iconButtonStyle: UIStyle.StyleOptions = {
	minWidth: 32,
	minHeight: 32,
	padding: 4,
	borderRadius: 8,
	borderWidth: 0,
	lineHeight: 1,
	fontSize: "0",
};

const baseLabelStyle: UIStyle.StyleOptions = {
	shrink: 1,
	maxWidth: "100%",
	lineBreakMode: "ellipsis",
	cursor: "inherit",
};

const baseBadgeLabelStyle: UIStyle.StyleOptions = {
	fontSize: 12,
	borderRadius: 6,
	padding: { x: 8, y: 2 },
	background: color_text.alpha(0.1),
};

const baseTextfieldStyle: UIStyle.StyleOptions = {
	textColor: color_text,
	borderWidth: 1,
	borderColor: color_transparent,
	borderRadius: 5,
	minWidth: 96,
	shrink: 1,
	height: 36,
	padding: { x: 10, y: 4 },
	lineBreakMode: "pre-wrap",
	lineHeight: 1.5,
	userTextSelect: true,
	cursor: "text",
};

const baseToggleStyle: UIStyle.StyleOptions = {
	padding: { y: 4 },
	shrink: 1,
	cursor: "pointer",
};

const disabledStyle: UIStyle.StyleStateOptions & UIStyle.StyleOptions = {
	[UIStyle.STATE_DISABLED]: true,
	opacity: 0.5,
	cursor: "default",
};

function makeButtonStyle(
	styles: UIStyle.StyleOptions | undefined,
	bg: UIColor,
	fg = bg.text(),
	baseBg?: UIColor,
	baseFg?: UIColor,
) {
	return new UIStyle(
		{
			...baseButtonStyle,
			background: baseBg || bg,
			textColor: baseFg || fg,
			...styles,
		},
		{
			[UIStyle.STATE_HOVERED]: true,
			background: baseBg ? bg : bg.contrast(-0.1),
			textColor: fg,
		},
		{
			[UIStyle.STATE_PRESSED]: true,
			background: bg.contrast(-0.1),
			textColor: fg,
		},
		disabledStyle,
	);
}

/** @internal Default preset styles */
export default {
	button: {
		default: makeButtonStyle(
			undefined,
			color_text.alpha(0.15),
			color_text,
			color_text.alpha(0.1),
		),
		primary: makeButtonStyle(undefined, color_primaryBackground),
		success: makeButtonStyle(undefined, color_successBackground),
		danger: makeButtonStyle(
			undefined,
			color_dangerBackground,
			undefined,
			color_text.alpha(0.15),
			color_danger,
		),
		plain: makeButtonStyle(
			{ minWidth: 0 },
			color_text.alpha(0.1),
			color_inherit,
			color_transparent,
		),
		text: makeButtonStyle(
			{
				minWidth: 0,
				padding: { y: 4 },
				borderRadius: 0,
				borderWidth: 0,
			},
			color_transparent,
			color_inherit,
		),
		link: makeButtonStyle(
			{
				minWidth: 0,
				padding: { y: 4 },
				borderRadius: 0,
				borderWidth: 0,
				underline: true,
			},
			color_transparent,
			color_link,
		),
		small: makeButtonStyle(
			{
				minHeight: 24,
				fontSize: 12,
				padding: { x: 8, y: 1 },
				minWidth: 88,
				borderRadius: 8,
			},
			color_text.alpha(0.15),
			color_text,
			color_text.alpha(0.1),
		),
		icon: makeButtonStyle(
			iconButtonStyle,
			color_text.alpha(0.1),
			color_inherit,
			color_transparent,
		),
		primaryIcon: makeButtonStyle(iconButtonStyle, color_primaryBackground),
		successIcon: makeButtonStyle(iconButtonStyle, color_successBackground),
		dangerIcon: makeButtonStyle(iconButtonStyle, color_dangerBackground),
		iconTop: makeButtonStyle(
			{
				padding: { top: 8, bottom: 4, x: 12 },
				css: {
					...baseButtonCss,
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					alignItems: "center",
				},
			},
			color_text.alpha(0.15),
			color_text,
			color_text.alpha(0.1),
		),
		iconTopStart: makeButtonStyle(
			{
				padding: { top: 8, bottom: 4, x: 12 },
				css: {
					...baseButtonCss,
					display: "flex",
					flexDirection: "column",
					justifyContent: "start",
					alignItems: "start",
				},
			},
			color_text.alpha(0.15),
			color_text,
			color_text.alpha(0.1),
		),
		iconTopEnd: makeButtonStyle(
			{
				padding: { top: 8, bottom: 4, x: 12 },
				css: {
					...baseButtonCss,
					display: "flex",
					flexDirection: "column",
					justifyContent: "end",
					alignItems: "end",
				},
			},
			color_text.alpha(0.15),
			color_text,
			color_text.alpha(0.1),
		),
	},
	label: {
		default: new UIStyle(baseLabelStyle),
		bold: new UIStyle(baseLabelStyle, { bold: true }),
		italic: new UIStyle(baseLabelStyle, { italic: true }),
		headline: new UIStyle(baseLabelStyle, { bold: true }),
		secondary: new UIStyle(baseLabelStyle, {
			opacity: 0.5,
			fontSize: 12,
			lineHeight: 1.3,
			letterSpacing: "-0.01em",
		}),
		small: new UIStyle(baseLabelStyle, {
			fontSize: 11,
			lineHeight: 1.2,
		}),
		title: new UIStyle(baseLabelStyle, {
			fontSize: 20,
			bold: true,
			letterSpacing: "0.02em",
		}),
		large: new UIStyle(baseLabelStyle, {
			fontSize: 28,
			bold: true,
			letterSpacing: "0.02em",
		}),
		badge: new UIStyle(baseBadgeLabelStyle),
		dangerBadge: new UIStyle(baseBadgeLabelStyle, {
			background: color_dangerBackground.alpha(0.1),
			textColor: color_danger,
		}),
		successBadge: new UIStyle(baseBadgeLabelStyle, {
			background: color_successBackground.alpha(0.1),
			textColor: color_success,
		}),
		toggleLabel: new UIStyle({
			textColor: color_text, // (don't inherit :checked fill)
			lineBreakMode: "pre-wrap",
			lineHeight: 1.5,
			padding: { y: 6 },
			css: { display: "inline" },
		}),
	},
	image: {
		default: new UIStyle({
			shrink: 1,
			maxWidth: "100%",
		}),
	},
	textfield: {
		default: new UIStyle(
			baseTextfieldStyle,
			{
				background: color_background,
				borderColor: color_text.alpha(0.2),
			},
			{
				[UIStyle.STATE_HOVERED]: true,
				[UIStyle.STATE_READONLY]: false,
				borderColor: color_text.alpha(0.3),
			},
			{
				[UIStyle.STATE_READONLY]: true,
				background: color_text.alpha(0.1),
				borderColor: color_transparent,
			},
			disabledStyle,
		),
		transparent: new UIStyle(
			baseTextfieldStyle,
			{ background: color_transparent },
			{
				[UIStyle.STATE_READONLY]: true,
				background: color_text.alpha(0.1),
			},
			disabledStyle,
		),
	},
	toggle: {
		default: new UIStyle(
			baseToggleStyle,
			{
				borderColor: color_text.alpha(0.2),
				textColor: color_primaryBackground, // :checked fill
			},
			{
				[UIStyle.STATE_HOVERED]: true,
				borderColor: color_text.alpha(0.3),
			},
			disabledStyle,
		),
		danger: new UIStyle(
			baseToggleStyle,
			{
				borderColor: color_dangerBackground,
				textColor: color_danger,
			},
			{
				[UIStyle.STATE_HOVERED]: true,
				borderColor: color_dangerBackground,
			},
		),
		success: new UIStyle(
			baseToggleStyle,
			{
				borderColor: color_successBackground,
				textColor: color_success,
			},
			{
				[UIStyle.STATE_HOVERED]: true,
				borderColor: color_successBackground,
			},
		),
	},
	divider: {
		default: new UIStyle(),
		dashed: new UIStyle({ borderStyle: "dashed" }),
		dotted: new UIStyle({ borderStyle: "dotted" }),
	},
};
