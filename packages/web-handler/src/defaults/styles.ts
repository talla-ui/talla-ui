import { UI } from "@talla-ui/core";
import type { WebNamedStyleDefinition } from "../DOMStyle.js";
import type { WebTheme } from "../WebTheme.js";

/**
 * @internal Returns default style definitions
 * - Called by WebTheme constructor to get initial styles
 * - Styles use `UI.colors` which resolves at call time
 */
export function makeDefaultStyles() {
	const result: Partial<
		Record<WebTheme.ElementType, Record<string, WebNamedStyleDefinition>>
	> = {};
	const colors = UI.colors;

	// --- button style

	const defaultButtonStyles: WebNamedStyleDefinition = {
		textColor: colors.text,
		background: colors.text.alpha(0.05),
		padding: "0.375rem 1rem",
		borderRadius: "1.125rem",
		borderWidth: 0,
		fontWeight: 600,
		textAlign: "center",
		lineBreakMode: "nowrap",
		minWidth: "6.5rem",
		shrink: 1,
		"+disabled": {
			opacity: 0.5,
			cursor: "default",
		},
	};
	const iconButtonStyles: WebNamedStyleDefinition = {
		...defaultButtonStyles,
		background: "transparent",
		minWidth: "2.125rem",
		minHeight: "2.125rem",
		padding: "0.25rem",
		borderRadius: "1.125rem",
		borderWidth: 0,
		lineHeight: 1,
		fontSize: 0,
		"+disabled": {
			opacity: 0.5,
			cursor: "default",
		},
	};

	result.button = {
		default: {
			...defaultButtonStyles,
			css: { "--button-state-opacity": "0.05" } as {},
		},
		accent: {
			...defaultButtonStyles,
			background: colors.accent,
			textColor: colors.accent.text(),
			"+disabled": {
				opacity: 0.5,
				cursor: "default",
			},
		},
		success: {
			...defaultButtonStyles,
			background: colors.success,
			textColor: colors.success.text(),
			"+disabled": {
				opacity: 0.5,
				cursor: "default",
			},
		},
		danger: {
			...defaultButtonStyles,
			background: colors.danger.alpha(0.15),
			textColor: colors.danger,
			css: { "--button-state-opacity": "0" } as {},
			"+hover": {
				background: colors.danger,
				textColor: colors.danger.text(),
			},
			"+focus": {
				background: colors.danger,
				textColor: colors.danger.text(),
			},
			"+pressed": {
				background: colors.danger.brighten(-0.2),
				textColor: colors.danger.text(),
			},
			"+disabled": {
				opacity: 0.5,
				cursor: "default",
			},
		},
		ghost: {
			...defaultButtonStyles,
			minWidth: 0,
			background: "transparent",
			css: { "--button-state-opacity": "0.05" } as {},
			"+disabled": {
				opacity: 0.5,
				cursor: "default",
			},
		},
		text: {
			...defaultButtonStyles,
			minWidth: 0,
			padding: "0.25rem",
			borderRadius: 0,
			background: "transparent",
			css: { "--button-state-opacity": "0" } as {},
			"+disabled": {
				opacity: 0.5,
				cursor: "default",
			},
		},
		link: {
			...defaultButtonStyles,
			minWidth: 0,
			underline: true,
			textColor: colors.link,
			background: "transparent",
			cursor: "pointer",
			"+disabled": {
				opacity: 0.5,
				cursor: "default",
			},
		},
		small: {
			...defaultButtonStyles,
			fontSize: "0.75rem",
			padding: "0.125rem 0.375rem",
			minWidth: "5rem",
		},
		icon: iconButtonStyles,
		accentIcon: {
			...iconButtonStyles,
			background: colors.accent,
			textColor: colors.accent.text(),
		},
		successIcon: {
			...iconButtonStyles,
			background: colors.success,
			textColor: colors.success.text(),
		},
		dangerIcon: {
			...iconButtonStyles,
			textColor: colors.danger,
			css: { "--button-state-opacity": "0" } as {},
			"+hover": {
				background: colors.danger,
				textColor: colors.danger.text(),
			},
			"+focus": {
				background: colors.danger,
				textColor: colors.danger.text(),
			},
			"+pressed": {
				background: colors.danger.brighten(-0.2),
				textColor: colors.danger.text(),
			},
			"+disabled": {
				opacity: 0.5,
				cursor: "default",
			},
		},
		iconTop: {
			...defaultButtonStyles,
			padding: "1rem 0.75rem 0.25rem",
			css: {
				display: "flex",
				flexDirection: "column",
				justifyContent: "center",
				alignItems: "center",
				gap: "0.5em",
			},
		},
		iconTopStart: {
			...defaultButtonStyles,
			padding: "1rem 0.75rem 0.25rem",
			css: {
				display: "flex",
				flexDirection: "column",
				justifyContent: "start",
				alignItems: "start",
				gap: "0.5em",
			},
		},
		iconTopEnd: {
			...defaultButtonStyles,
			padding: "1rem 0.75rem 0.25rem",
			css: {
				display: "flex",
				flexDirection: "column",
				justifyContent: "end",
				alignItems: "end",
				gap: "0.5em",
			},
		},
	};

	// --- text style

	const baseTextStyle: WebNamedStyleDefinition = {
		shrink: 1,
		maxWidth: "100%",
		lineBreakMode: "ellipsis",
		cursor: "inherit",
	};
	const baseBadgeStyle: WebNamedStyleDefinition = {
		...baseTextStyle,
		fontSize: "0.75rem",
		borderRadius: "0.375rem",
		padding: "0.125rem 0.5rem",
	};

	result.text = {
		default: { ...baseTextStyle },
		body: { ...baseTextStyle },
		large: {
			...baseTextStyle,
			fontSize: "1.75rem",
			bold: true,
		},
		title: {
			...baseTextStyle,
			fontSize: "1.25rem",
			bold: true,
		},
		headline: {
			...baseTextStyle,
			bold: true,
		},
		caption: {
			...baseTextStyle,
			fontSize: "0.6875rem",
			lineHeight: 1.2,
		},
		badge: {
			...baseBadgeStyle,
			background: colors.accent.alpha(0.1),
			textColor: colors.accent,
		},
		dangerBadge: {
			...baseBadgeStyle,
			background: colors.danger.alpha(0.1),
			textColor: colors.danger,
		},
		successBadge: {
			...baseBadgeStyle,
			background: colors.success.alpha(0.1),
			textColor: colors.success,
		},
		toggleText: {
			textColor: colors.text,
			lineBreakMode: "pre-wrap",
			padding: "0.375rem 0",
			css: { display: "inline" },
		},
	};

	// --- textfield style

	// Base text field options
	const baseTextFieldStyle: WebNamedStyleDefinition = {
		textColor: colors.text,
		borderWidth: 1,
		borderStyle: "solid",
		borderRadius: "0.375rem",
		minWidth: "6rem",
		shrink: 1,
		height: "2.125rem",
		padding: "0.25rem 0.625rem",
		lineBreakMode: "pre-wrap",
		lineHeight: 1.5,
		cursor: "text",
		"+disabled": {
			opacity: 0.5,
			cursor: "default",
		},
	};

	result.textfield = {
		default: {
			...baseTextFieldStyle,
			background: colors.background,
			borderColor: colors.text.alpha(0.2),
			"+hover": {
				borderColor: colors.text.alpha(0.3),
			},
			"+readonly": {
				background: colors.text.alpha(0.1),
				css: { borderColor: "transparent" },
			},
		},
		ghost: {
			...baseTextFieldStyle,
			background: "transparent",
			css: { borderColor: "transparent" },
			"+hover": {
				css: { borderColor: "transparent" },
			},
			"+readonly": {
				background: colors.text.alpha(0.1),
			},
		},
	};

	// --- toggle style

	const baseToggleStyle: WebNamedStyleDefinition = {
		padding: "0.25rem 0",
		shrink: 1,
		"+disabled": {
			opacity: 0.5,
			cursor: "default",
		},
	};

	result.toggle = {
		default: {
			...baseToggleStyle,
			borderColor: colors.text.alpha(0.2),
			textColor: colors.accent,
			"+hover": {
				borderColor: colors.text.alpha(0.3),
			},
		},
		danger: {
			...baseToggleStyle,
			borderColor: colors.danger,
			textColor: colors.danger,
		},
		succes: {
			...baseToggleStyle,
			borderColor: colors.success,
			textColor: colors.success,
		},
	};

	// --- divider style

	result.divider = {
		default: {},
		dashed: { borderStyle: "dashed" },
		dotted: { borderStyle: "dotted" },
	};

	// --- container style

	result.container = {
		default: {},

		// used by default ModalMenu:
		"ModalMenu-item": {
			margin: { x: 4 },
			padding: { x: 12, y: 6 },
			borderRadius: 6,
			cursor: "pointer",
			"+hover": {
				background: UI.colors.background.fg(
					UI.colors.background.contrast(-0.1),
					UI.colors.background.contrast(-0.3),
				),
			},
		},
	};

	return result;
}
