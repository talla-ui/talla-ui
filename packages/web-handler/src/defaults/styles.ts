import { UI, UIColor, UIStyle } from "@talla-ui/core";

const color_inherit = new UIColor("inherit");
const colors = UI.colors;
const color_transparent = colors.transparent;
const color_text = colors.text;
const color_background = colors.background;
const color_accent = colors.accent;
const color_success = colors.success;
const color_danger = colors.danger;
const color_link = colors.link;

const baseButtonOptions: UIStyle.StyleOptions = {
	background: color_text.alpha(0.05),
	textColor: color_inherit,
	padding: { y: 1, x: 12 },
	borderRadius: 8,
	borderWidth: 1,
	borderColor: color_text.alpha(0.1),
	fontWeight: 600,
	textAlign: "center",
	lineBreakMode: "nowrap",
	lineHeight: 2,
	minWidth: 104,
	shrink: 1,
};

const iconButtonOptions: UIStyle.StyleOptions = {
	background: color_transparent,
	minWidth: 32,
	minHeight: 32,
	padding: 4,
	borderRadius: 16,
	borderWidth: 0,
	lineHeight: 1,
	fontSize: "0",
};

const baseLabelOptions: UIStyle.StyleOptions = {
	shrink: 1,
	maxWidth: "100%",
	lineBreakMode: "ellipsis",
	cursor: "inherit",
};

const baseBadgeLabelOptions: UIStyle.StyleOptions = {
	fontSize: 12,
	borderRadius: 6,
	padding: { x: 8, y: 2 },
};

const baseTextfieldOptions: UIStyle.StyleOptions = {
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

const baseToggleOptions: UIStyle.StyleOptions = {
	padding: { y: 4 },
	shrink: 1,
};

const disabledOptions: UIStyle.StyleOptions = {
	opacity: 0.5,
	cursor: "default",
};

const _btnBg1 = { background: color_text.alpha(0.1) };
const _btnBg2 = { background: color_text.alpha(0.2) };
const defaultButtonStyle = new UIStyle(baseButtonOptions)
	.setDisabled(disabledOptions)
	.setHovered(_btnBg1)
	.setFocused(_btnBg1)
	.setPressed(_btnBg2, _btnBg2, _btnBg2);

function makeButtonStyle(
	options: UIStyle.StyleOptions,
	focusOptions?: UIStyle.StyleOptions,
	pressedOptions?: UIStyle.StyleOptions,
) {
	let combo1 = { ...options, ...focusOptions };
	let combo2 = { ...options, ...pressedOptions };
	return UI.styles.button.default
		.extend({ ...options })
		.setHovered(combo1)
		.setFocused(combo1)
		.setPressed(combo2, combo2, combo2)
		.setDisabled(disabledOptions);
}

/** @internal Default preset styles */
export default {
	button: {
		default: defaultButtonStyle,
		accent: makeButtonStyle(
			{ background: color_accent, textColor: color_accent.text() },
			{ background: color_accent.brighten(-0.1), borderColor: color_accent },
			{ background: color_accent.brighten(-0.2) },
		),
		success: makeButtonStyle(
			{ background: color_success, textColor: color_success.text() },
			{ background: color_success.brighten(-0.1), borderColor: color_success },
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
				borderColor: color_transparent,
			},
			_btnBg1,
			_btnBg2,
		),
		text: makeButtonStyle({
			minWidth: 0,
			padding: { y: 4 },
			borderRadius: 0,
			borderWidth: 0,
			background: color_transparent,
		}),
		link: makeButtonStyle(
			{
				minWidth: 0,
				underline: true,
				textColor: color_link,
				background: color_transparent,
				borderColor: color_transparent,
			},
			{ background: color_link.alpha(0.1) },
			{ background: color_link.alpha(0.2) },
		),
		small: makeButtonStyle({
			fontSize: 12,
			padding: { x: 6 },
			minWidth: 80,
		}),
		icon: makeButtonStyle(iconButtonOptions, _btnBg1, _btnBg2),
		successIcon: makeButtonStyle(
			{
				...iconButtonOptions,
				background: color_success,
				textColor: color_success.text(),
			},
			{ background: color_success.contrast(-0.1) },
			{ background: color_success.contrast(-0.2) },
		),
		dangerIcon: makeButtonStyle(
			{
				...iconButtonOptions,
				textColor: color_danger,
			},
			{ background: color_danger, textColor: color_danger.text() },
			{
				background: color_danger.contrast(-0.2),
				textColor: color_danger.text(),
			},
		),
		iconTop: makeButtonStyle({
			padding: { top: 8, bottom: 4, x: 12 },
			css: {
				display: "flex",
				flexDirection: "column",
				justifyContent: "center",
				alignItems: "center",
			},
		}),
		iconTopStart: makeButtonStyle({
			padding: { top: 8, bottom: 4, x: 12 },
			css: {
				display: "flex",
				flexDirection: "column",
				justifyContent: "start",
				alignItems: "start",
			},
		}),
		iconTopEnd: makeButtonStyle({
			padding: { top: 8, bottom: 4, x: 12 },
			css: {
				display: "flex",
				flexDirection: "column",
				justifyContent: "end",
				alignItems: "end",
			},
		}),
	},
	label: {
		default: new UIStyle(baseLabelOptions),
		body: new UIStyle(baseLabelOptions),
		large: new UIStyle(baseLabelOptions, {
			fontSize: 28,
			bold: true,
			letterSpacing: "0.02em",
		}),
		title: new UIStyle(baseLabelOptions, {
			fontSize: 20,
			bold: true,
			letterSpacing: "0.02em",
		}),
		headline: new UIStyle(baseLabelOptions, { bold: true }),
		caption: new UIStyle(baseLabelOptions, {
			fontSize: 11,
			lineHeight: 1.2,
		}),
		badge: new UIStyle(baseBadgeLabelOptions, {
			background: color_accent.alpha(0.1),
			textColor: color_accent,
		}),
		dangerBadge: new UIStyle(baseBadgeLabelOptions, {
			background: color_danger.alpha(0.1),
			textColor: color_danger,
		}),
		successBadge: new UIStyle(baseBadgeLabelOptions, {
			background: color_success.alpha(0.1),
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
		default: new UIStyle(baseTextfieldOptions, {
			background: color_background,
			borderColor: color_text.alpha(0.2),
		})
			.setHovered({ borderColor: color_text.alpha(0.3) })
			.setReadonly(
				{
					background: color_text.alpha(0.1),
					borderColor: color_transparent,
				},
				{ borderColor: color_text.alpha(0.3) },
			)
			.setDisabled(disabledOptions),
		ghost: new UIStyle(baseTextfieldOptions, {
			background: color_transparent,
		})
			.setReadonly({ background: color_text.alpha(0.1) })
			.setDisabled(disabledOptions),
	},
	toggle: {
		default: new UIStyle(baseToggleOptions, {
			borderColor: color_text.alpha(0.2),
			textColor: color_accent, // :checked fill
		})
			.setHovered({ borderColor: color_text.alpha(0.3) })
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
