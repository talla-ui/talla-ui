import { UI } from "@talla-ui/core";
import type { WebTheme } from "../WebTheme";

/**
 * @internal Returns default button variant style definitions keyed by variant name.
 * - Called by WebTheme constructor to get initial button styles.
 * - Styles use `UI.colors` which resolves at call time.
 */
export function makeButtonStyles(): Record<string, WebTheme.StyleDefinition> {
	const colors = UI.colors;
	const baseStyles: WebTheme.StyleDefinition = {
		background: colors.text.alpha(0.05),
		textColor: colors.text,
		padding: "0.375rem 1rem",
		borderRadius: "1.125rem",
		borderWidth: 0,
		fontWeight: 600,
		textAlign: "center",
		lineBreakMode: "nowrap",
		minWidth: "6.5rem",
		"+disabled": {
			opacity: 0.5,
			cursor: "default",
		},
	};

	return {
		bare: {
			...baseStyles,
			background: colors.transparent,
			minWidth: "none",
			padding: "0.375rem 0.5rem",
			textAlign: "start",
			css: { "--button-state-opacity": "0" } as {},
		},
		default: {
			...baseStyles,
			css: { "--button-state-opacity": "0.05" } as {},
		},
		accent: {
			background: colors.accent,
			textColor: colors.accent.text(),
			"+disabled": {
				opacity: 0.5,
				cursor: "default",
			},
		},
		ghost: {
			minWidth: 0,
			borderColor: colors.transparent,
			background: "transparent",
			css: { "--button-state-opacity": "0.05" } as {},
			"+disabled": {
				opacity: 0.5,
				cursor: "default",
			},
		},
		link: {
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
			fontSize: "0.75rem",
			padding: "0.125rem 0.375rem",
			minWidth: "5rem",
		},
		icon: {
			minWidth: "2.125rem",
			minHeight: "2.125rem",
			padding: "0.25rem",
			borderRadius: "1.125rem",
			borderWidth: 0,
			textAlign: "center",
			lineHeight: 1,
			fontSize: 0,
			"+disabled": {
				opacity: 0.5,
				cursor: "default",
			},
		},
	};
}

/**
 * @internal Returns default text field variant style definitions keyed by variant name.
 */
export function makeTextFieldStyles(): Record<
	string,
	WebTheme.StyleDefinition
> {
	const colors = UI.colors;
	const baseStyles: WebTheme.StyleDefinition = {
		textColor: colors.text,
		borderColor: colors.text.alpha(0.2),
		borderWidth: 1,
		borderStyle: "solid",
		borderRadius: "0.375rem",
		minWidth: "6rem",
		height: "2.125rem",
		padding: "0.25rem 0.625rem",
		lineBreakMode: "pre-wrap",
		lineHeight: 1.5,
		cursor: "text",
		background: colors.background,
	};

	return {
		bare: {
			...baseStyles,
			borderColor: colors.transparent,
			background: colors.transparent,
		},
		default: {
			...baseStyles,
			"+hover": { borderColor: colors.text.alpha(0.3) },
			"+disabled": {
				opacity: 0.5,
				cursor: "default",
			},
			"+readonly": {
				background: colors.text.alpha(0.1),
				css: { borderColor: "transparent" },
			},
		},
		ghost: {
			borderColor: colors.transparent,
			background: colors.transparent,
			"+hover": { borderColor: colors.text.alpha(0.1) },
		},
		invalid: {
			borderColor: colors.danger,
			"+hover": { borderColor: colors.danger },
		},
	};
}
