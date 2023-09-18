import {
	UIButtonStyle,
	UICloseLabelStyle,
	UIColor,
	UIComponent,
	UIHeading1LabelStyle,
	UIHeading2LabelStyle,
	UIHeading3LabelStyle,
	UIIconButtonStyle,
	UIImageStyle,
	UILabelStyle,
	UIParagraphLabelStyle,
	UIPlainButtonStyle,
	UIPrimaryButtonStyle,
	UITextFieldStyle,
	UITheme,
	UIToggleLabelStyle,
	UIToggleStyle,
} from "@desk-framework/frame-core";

type CombinedStyleType = UIComponent.DimensionsStyleType &
	UIComponent.DecorationStyleType &
	UIComponent.TextStyleType &
	UITheme.StyleStateOptions;

/** @internal Defaults used for control text style */
export const defaultControlTextStyle: CombinedStyleType = {
	fontFamily:
		'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, "Helvetica Neue", Arial, sans-serif',
	fontSize: "0.875rem",
	lineHeight: "1.25",
};

const controlBase = UIColor["@controlBase"];

const baseButtonStyle: CombinedStyleType = {
	padding: { y: 4, x: 12 },
	borderRadius: 12,
	borderThickness: 1,
	borderColor: UIColor["@clear"],
	background: controlBase,
	textColor: controlBase.text(),
	fontWeight: 600,
	textAlign: "center",
	lineBreakMode: "ellipsis",
	minWidth: 112,
	minHeight: 40,
	shrink: 0,
	css: {
		position: "relative",
		overflow: "hidden",
		userSelect: "none",
		cursor: "pointer",
		transition: "background 0.1s ease, border-color 0.1s ease",
	},
};

const baseLabelStyle: CombinedStyleType = {
	maxWidth: "100%",
	lineBreakMode: "ellipsis",
	css: { cursor: "inherit" },
};

const disabledStyle: CombinedStyleType = {
	[UITheme.STATE_DISABLED]: true,
	opacity: 0.5,
	css: { cursor: "default" },
};

const hoveredNotDisabled: CombinedStyleType = {
	[UITheme.STATE_HOVERED]: true,
	[UITheme.STATE_DISABLED]: false,
};

const pressedNotDisabled: CombinedStyleType = {
	[UITheme.STATE_PRESSED]: true,
	[UITheme.STATE_DISABLED]: false,
};

/** @internal Default styles for `UITheme.styles` */
export const styles: [
	styleClass: new () => UITheme.BaseStyle<string, any>,
	styles: UITheme.StyleSelectorList<CombinedStyleType>,
][] = [
	[
		UIButtonStyle,
		[
			baseButtonStyle,
			{
				...hoveredNotDisabled,
				background: controlBase.contrast(-0.1),
			},
			{
				...pressedNotDisabled,
				background: controlBase.contrast(0.1),
			},
			disabledStyle,
		],
	],
	[
		UIPrimaryButtonStyle,
		[
			{
				...baseButtonStyle,
				background: UIColor["@primaryBackground"],
				textColor: UIColor["@primaryBackground"].text(),
			},
			{
				...hoveredNotDisabled,
				background: UIColor["@primaryBackground"].contrast(0.2),
			},
			{
				...pressedNotDisabled,
				background: UIColor["@primaryBackground"].contrast(-0.1),
			},
			disabledStyle,
		],
	],
	[
		UIPlainButtonStyle,
		[
			{
				...baseButtonStyle,
				background: UIColor["@clear"],
				textColor: UIColor["@text"],
				minWidth: 0,
			},
			{
				...hoveredNotDisabled,
				background: controlBase,
			},
			{
				...pressedNotDisabled,
				background: controlBase.contrast(-0.1),
			},
			disabledStyle,
		],
	],
	[
		UIIconButtonStyle,
		[
			{
				minWidth: 32,
				minHeight: 32,
				padding: 4,
				shrink: 0,
				borderRadius: "50%",
				background: UIColor["@clear"],
				textColor: UIColor["@text"],
				lineHeight: 1,
				fontSize: "0",
				css: {
					cursor: "pointer",
					transition: "background 0.2s ease, border-color 0.2s ease",
				},
			},
			{
				...hoveredNotDisabled,
				background: controlBase,
			},
			{
				...pressedNotDisabled,
				background: controlBase.contrast(-0.1),
			},
			disabledStyle,
		],
	],
	[
		UILabelStyle,
		[
			{
				...baseLabelStyle,
				lineHeight: 1.5,
				padding: { y: 6 },
			},
		],
	],
	[
		UICloseLabelStyle,
		[
			{
				...baseLabelStyle,
				padding: 0,
			},
		],
	],
	[
		UIHeading1LabelStyle,
		[
			{
				...baseLabelStyle,
				fontSize: "2em",
				fontWeight: 600,
				letterSpacing: -0.5,
			},
		],
	],
	[
		UIHeading2LabelStyle,
		[{ ...baseLabelStyle, fontSize: "1.75em", fontWeight: 600 }],
	],
	[
		UIHeading3LabelStyle,
		[{ ...baseLabelStyle, fontSize: "1.375em", fontWeight: 600 }],
	],
	[
		UIParagraphLabelStyle,
		[
			{
				lineBreakMode: "pre-wrap",
				lineHeight: 1.5,
				padding: { y: 6 },
				css: { cursor: "text" },
			},
		],
	],
	[UIImageStyle, [{ maxWidth: "100%" }]],
	[
		UITextFieldStyle,
		[
			{
				background: UIColor["@background"],
				textColor: UIColor["@text"],
				borderThickness: 1,
				borderColor: controlBase.contrast(-0.1),
				borderRadius: 5,
				minWidth: 96,
				padding: 8,
				lineBreakMode: "pre-wrap",
				lineHeight: 1.5,
				css: { cursor: "text" },
			},
			{
				...hoveredNotDisabled,
				[UITheme.STATE_READONLY]: false,
				borderColor: controlBase.contrast(-0.2),
			},
			{
				[UITheme.STATE_READONLY]: true,
				background: UIColor["@background"].contrast(-0.1),
				borderColor: UIColor["@background"].contrast(-0.1),
			},
			disabledStyle,
		],
	],
	[
		UIToggleStyle,
		[
			{
				padding: { y: 8 },
				css: { userSelect: "none", cursor: "pointer" },
			},
			disabledStyle,
		],
	],
	[
		UIToggleLabelStyle,
		[
			{
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
