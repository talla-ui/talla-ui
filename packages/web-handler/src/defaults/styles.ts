import { UI, UIColor, UIStyle } from "@talla-ui/core";

const color_inherit = new UIColor("inherit");
const colors = UI.colors;
const color_transparent = colors.transparent;
const color_text = colors.text;
const color_text_05 = colors.text.alpha(0.05);
const color_text_1 = colors.text.alpha(0.1);
const color_text_2 = colors.text.alpha(0.2);
const color_text_3 = colors.text.alpha(0.3);
const color_background = colors.background;
const color_accent = colors.accent;
const color_success = colors.success;
const color_danger = colors.danger;
const color_link = colors.link;

const BTN_ACCENT_THRESHOLD = 0.2;

const baseButtonOptions: UIStyle.StyleOptions = {
	background: color_text_05,
	textColor: color_inherit,
	padding: { y: 6, x: 16 },
	borderRadius: 18,
	borderWidth: 0,
	fontWeight: 600,
	textAlign: "center",
	lineBreakMode: "nowrap",
	minWidth: 104,
	shrink: 1,
};

const iconButtonOptions: UIStyle.StyleOptions = {
	background: color_transparent,
	minWidth: 34,
	minHeight: 34,
	padding: 4,
	borderRadius: 18,
	borderWidth: 0,
	lineHeight: 1,
	fontSize: "0",
};

const baseTextOptions: UIStyle.StyleOptions = {
	shrink: 1,
	maxWidth: "100%",
	lineBreakMode: "ellipsis",
	cursor: "inherit",
};

const baseBadgeTextOptions: UIStyle.StyleOptions = {
	fontSize: 12,
	borderRadius: 6,
	padding: { x: 8, y: 2 },
};

const baseTextFieldOptions: UIStyle.StyleOptions = {
	textColor: color_text,
	borderWidth: 1,
	borderColor: color_transparent,
	borderRadius: 6,
	minWidth: 96,
	shrink: 1,
	height: 34,
	padding: { x: 10, y: 4 },
	lineBreakMode: "pre-wrap",
	lineHeight: 1.5,
	userTextSelect: true,
	cursor: "text",
};

const baseToggleOptions: UIStyle.StyleOptions = {
	padding: { y: 4 },
	shrink: 1,
};

const disabledOptions: UIStyle.StyleOptions = {
	opacity: 0.5,
	cursor: "default",
};

const _btnBg1 = { background: color_text_1 };
const _btnBg2 = { background: color_text_2 };
const defaultButtonStyle = new UIStyle(baseButtonOptions)
	.setDisabled(disabledOptions)
	.setHovered(_btnBg1)
	.setFocused(_btnBg1)
	.setPressed(_btnBg2);

function makeButtonStyle(
	options: UIStyle.StyleOptions,
	focusOptions: UIStyle.StyleOptions = {},
	pressedOptions: UIStyle.StyleOptions = {},
) {
	return UI.styles.button.default
		.extend({ ...options })
		.setHovered(focusOptions)
		.setFocused(focusOptions)
		.setPressed(pressedOptions)
		.setDisabled(disabledOptions);
}

/** @internal Default preset styles */
export default {
	button: {
		default: defaultButtonStyle,
		accent: makeButtonStyle(
			{ background: color_accent, textColor: color_accent.text() },
			{
				background: color_accent.contrast(-0.1, BTN_ACCENT_THRESHOLD),
			},
			{ background: color_accent.contrast(-0.2, BTN_ACCENT_THRESHOLD) },
		),
		success: makeButtonStyle(
			{ background: color_success, textColor: color_success.text() },
			{
				background: color_success.brighten(-0.1),
			},
			{ background: color_success.brighten(-0.2) },
		),
		danger: makeButtonStyle(
			{ background: color_danger.alpha(0.15), textColor: color_danger },
			{ background: color_danger, textColor: color_danger.text() },
			{
				background: color_danger.brighten(-0.2),
				textColor: color_danger.text(),
			},
		),
		ghost: makeButtonStyle(
			{
				minWidth: 0,
				background: color_transparent,
			},
			_btnBg1,
			_btnBg2,
		),
		text: makeButtonStyle(
			{
				minWidth: 0,
				padding: { y: 4 },
				borderRadius: 0,
				borderWidth: 0,
				background: color_transparent,
			},
			{ background: color_transparent },
			{ background: color_transparent },
		),
		link: makeButtonStyle(
			{
				minWidth: 0,
				underline: true,
				textColor: color_link,
				background: color_transparent,
				cursor: "pointer",
			},
			{ background: color_link.alpha(0.1) },
			{ background: color_link.alpha(0.2) },
		),
		small: makeButtonStyle({
			fontSize: 12,
			padding: { x: 6, y: 2 },
			minWidth: 80,
		}),
		icon: makeButtonStyle(iconButtonOptions, _btnBg1, _btnBg2),
		accentIcon: makeButtonStyle(
			{
				...iconButtonOptions,
				background: color_accent,
				textColor: color_accent.text(),
			},
			{ background: color_accent.contrast(-0.1) },
			{ background: color_accent.contrast(-0.2) },
		),
		successIcon: makeButtonStyle(
			{
				...iconButtonOptions,
				background: color_success,
				textColor: color_success.text(),
			},
			{ background: color_success.brighten(-0.1) },
			{ background: color_success.brighten(-0.2) },
		),
		dangerIcon: makeButtonStyle(
			{
				...iconButtonOptions,
				textColor: color_danger,
			},
			{ background: color_danger, textColor: color_danger.text() },
			{
				background: color_danger.brighten(-0.2),
				textColor: color_danger.text(),
			},
		),
		iconTop: makeButtonStyle({
			padding: { top: 16, bottom: 4, x: 12 },
			css: {
				display: "flex",
				flexDirection: "column",
				justifyContent: "center",
				alignItems: "center",
				gap: "0.5em",
			},
		}),
		iconTopStart: makeButtonStyle({
			padding: { top: 16, bottom: 4, x: 12 },
			css: {
				display: "flex",
				flexDirection: "column",
				justifyContent: "start",
				alignItems: "start",
				gap: "0.5em",
			},
		}),
		iconTopEnd: makeButtonStyle({
			padding: { top: 16, bottom: 4, x: 12 },
			css: {
				display: "flex",
				flexDirection: "column",
				justifyContent: "end",
				alignItems: "end",
				gap: "0.5em",
			},
		}),
	},
	text: {
		default: new UIStyle(baseTextOptions),
		body: new UIStyle(baseTextOptions),
		large: new UIStyle(baseTextOptions, {
			fontSize: 28,
			bold: true,
		}),
		title: new UIStyle(baseTextOptions, {
			fontSize: 20,
			bold: true,
		}),
		headline: new UIStyle(baseTextOptions, { bold: true }),
		caption: new UIStyle(baseTextOptions, {
			fontSize: 11,
			lineHeight: 1.2,
		}),
		badge: new UIStyle(baseBadgeTextOptions, {
			background: color_accent.alpha(0.1),
			textColor: color_accent,
		}),
		dangerBadge: new UIStyle(baseBadgeTextOptions, {
			background: color_danger.alpha(0.1),
			textColor: color_danger,
		}),
		successBadge: new UIStyle(baseBadgeTextOptions, {
			background: color_success.alpha(0.1),
			textColor: color_success,
		}),
		toggleText: new UIStyle({
			textColor: color_text, // (don't inherit :checked fill)
			lineBreakMode: "pre-wrap",
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
	textField: {
		default: new UIStyle(baseTextFieldOptions, {
			background: color_background,
			borderColor: color_text_2,
		})
			.setHovered({ borderColor: color_text_3 })
			.setReadonly(
				{
					background: color_text_1,
					borderColor: color_transparent,
				},
				{ borderColor: color_text_3 },
			)
			.setDisabled(disabledOptions),
		ghost: new UIStyle(baseTextFieldOptions, {
			background: color_transparent,
		})
			.setReadonly({ background: color_text_1 })
			.setDisabled(disabledOptions),
	},
	toggle: {
		default: new UIStyle(baseToggleOptions, {
			borderColor: color_text_2,
			textColor: color_accent, // :checked fill
		})
			.setHovered({ borderColor: color_text_3 })
			.setDisabled(disabledOptions),
		danger: new UIStyle(baseToggleOptions, {
			borderColor: color_danger,
			textColor: color_danger,
		}).setDisabled(disabledOptions),
		success: new UIStyle(baseToggleOptions, {
			borderColor: color_success,
			textColor: color_success,
		}).setDisabled(disabledOptions),
	},
	divider: {
		default: new UIStyle(),
		dashed: new UIStyle({ borderStyle: "dashed" }),
		dotted: new UIStyle({ borderStyle: "dotted" }),
	},
};
