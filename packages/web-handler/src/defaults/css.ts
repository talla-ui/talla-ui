/** @internal UI element class name */
export const CLASS_UI = "WebHandler__UI";
/** @internal Named style class prefix */
export const CLASS_NAMED = "WebHandler-";
/** @internal Page root element class name */
export const CLASS_PAGE_ROOT = "WebHandler__Pg";
/** @internal Page wrapper element class name (for page mode scrolling) */
export const CLASS_PAGE_WRAPPER = "WebHandler__PgWr";
/** @internal Modal/overlay root (shader) element class name */
export const CLASS_OVERLAY_SHADER = "WebHandler__Ovl";
/** @internal Modal/overlay wrapper element class name */
export const CLASS_OVERLAY_WRAPPER = "WebHandler__Wr";
/** @internal Container separator element class name: horizontal or vertical line */
export const CLASS_SEPARATOR_LINE = "WebHandler__Sp-l";
/** @internal Container separator element class name: vertical line */
export const CLASS_SEPARATOR_LINE_VERT = "WebHandler__Sp-lv";
/** @internal Container separator element class name: spacer */
export const CLASS_SEPARATOR_SPACER = "WebHandler__Sp";
/** @internal Additional text control class name */
export const CLASS_TEXTCONTROL = "WebHandler__T";
/** @internal Additional container class name */
export const CLASS_CONTAINER = "__C";
/** @internal Additional column class name */
export const CLASS_COLUMN = "__CC";
/** @internal Additional row class name */
export const CLASS_ROW = "__CR";
/** @internal Additional scroll container class name */
export const CLASS_SCROLL = "__CS";
/** @internal Additional toggle wrapper class name */
export const CLASS_TOGGLE = "__Tg";
/** @internal Additional toggle wrapper class names by type */
export const CLASS_TOGGLE_TYPE = {
	checkbox: "__Tg-c",
	switch: "__Tg-s",
	none: "__Tg-n",
} as const;

/** @internal Returns an object with necessary global CSS classes */
export function makeBaseCSS(): Record<string, {}> {
	return {
		// add UI element base style
		[`.${CLASS_UI}`]: {
			display: "block",
			margin: "0",
			padding: "0",
			border: "0 solid transparent",
			cursor: "inherit",
			boxSizing: "border-box",
			flexGrow: "0",
			flexShrink: "0",
			whiteSpace: "pre",
			textOverflow: "ellipsis",
			textDecoration: "none",
			fontWeight: "normal",
			userSelect: "none",
			webkitUserSelect: "none",
			webkitTapHighlightColor: "transparent",
			webkitTextSizeAdjust: "100%",
		},
		[`.${CLASS_UI}[disabled]`]: {
			pointerEvents: "none",
			cursor: "default",
		},
		[`.${CLASS_UI}.${CLASS_CONTAINER}`]: {
			pointerEvents: "auto",
			position: "relative",
			display: "flex",
			textAlign: "start||left",
			flexDirection: "column",
			justifyContent: "flex-start",
			alignItems: "stretch",
		},
		[`.${CLASS_UI}.${CLASS_ROW}`]: {
			alignItems: "center",
			flexDirection: "row",
			// make sure row is full width for gravity=overlay:
			left: "0",
			right: "0",
		},
		[`.${CLASS_UI}.${CLASS_COLUMN}`]: {
			// make sure column is full height for gravity=overlay:
			top: "0",
			bottom: "0",
		},
		[`.${CLASS_UI}.${CLASS_SCROLL}`]: {
			alignSelf: "stretch",
			flexShrink: "1",
			flexGrow: "1",
		},

		// set sensible placeholder style
		[`input.${CLASS_UI}::placeholder`]: {
			color: "inherit",
			opacity: "0.5",
		},

		// CSS for alignment of images
		[`.${CLASS_UI} figure`]: {
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			overflow: "hidden",
			fontSize: "0",
		},
		[`.${CLASS_UI} figure>img`]: {
			display: "block",
			width: "100%",
			height: "100%",
			objectFit: "cover",
		},

		// CSS for alignment of elements within buttons/text elements
		[`button.${CLASS_UI},a.${CLASS_UI}`]: {
			position: "relative",
			overflow: "hidden",
		},

		// State layer pseudo-element for button hover/focus/pressed feedback
		[`button.${CLASS_UI}::after,a.${CLASS_UI}::after`]: {
			content: "''",
			position: "absolute",
			inset: "0",
			borderRadius: "inherit",
			background: "var(--button-state-color,currentColor)",
			opacity: "0",
			pointerEvents: "none",
			transition: "opacity 0.1s ease-in-out",
		},
		[`button.${CLASS_UI}:hover:not([disabled])::after,a.${CLASS_UI}:hover:not([disabled])::after`]:
			{
				opacity: "var(--button-state-opacity,0.1)",
			},
		[`button.${CLASS_UI}:focus:not([disabled])::after,a.${CLASS_UI}:focus:not([disabled])::after`]:
			{
				opacity: "var(--button-state-opacity,0.1)",
			},
		[`button.${CLASS_UI}:active:not([disabled])::after,a.${CLASS_UI}:active:not([disabled])::after,button.${CLASS_UI}[aria-pressed=true]:not([disabled])::after,a.${CLASS_UI}[aria-pressed=true]:not([disabled])::after`]:
			{
				opacity: "calc(var(--button-state-opacity,0.1) * 1.5)",
			},
		[`.${CLASS_UI} icon`]: {
			display: "inline-flex",
			alignItems: "center",
			justifyContent: "center",
			verticalAlign: "middle",
			position: "relative",
			top: "-0.0625em", // relative to font size, so icon buttons not affected
			height: 0,
			lineHeight: 1,
		},
		[`.${CLASS_UI}>._chevron-wrapper`]: {
			display: "inline-flex",
			alignItems: "center",
			position: "absolute",
			fontSize: "0",
			top: "0",
			bottom: "0",
		},

		// flip icons in RTL mode
		[`[dir="rtl"] .${CLASS_UI} ._RTL-flip`]: {
			transform: "scaleX(-1)",
		},

		// add style for root output elements
		[`.${CLASS_PAGE_ROOT}`]: {
			position: "fixed",
			top: "0",
			bottom: "0",
			left: "0",
			right: "0",
			overflow: "hidden",
			contain: "layout paint",
			display: "flex",
			flexDirection: "column",
			cursor: "default",
		},
		["web-handler-page-root[data-mode=page]:only-of-type:not([data-viewport-override])"]:
			{
				position: "relative",
				minHeight: "100vh",
				top: "auto",
				bottom: "auto",
				left: "auto",
				right: "auto",
			},
		[`web-handler-page-root:not([data-viewport-override]) .${CLASS_PAGE_WRAPPER}`]:
			{
				minHeight: "100vh",
			},
		[`.${CLASS_PAGE_WRAPPER}`]: {
			display: "flex",
			flexDirection: "column",
			flex: "0 1 auto",
		},
		[`.${CLASS_OVERLAY_SHADER}`]: {
			zIndex: "1000",
			position: "fixed",
			top: "0",
			left: "0",
			bottom: "0",
			right: "0",
			outline: "0",
			overflow: "auto",
			contain: "content",
			transition: "background-color 200ms ease-in-out",
			background: "transparent",
			cursor: "default",
		},
		[`.${CLASS_OVERLAY_WRAPPER}`]: {
			display: "flex",
			flexDirection: "column",
			justifyContent: "start", // otherwise tall modals expand above frame
			position: "absolute",
			width: "100%",
			height: "100%",
		},
		[`.${CLASS_OVERLAY_WRAPPER}>.${CLASS_UI}`]: {
			zIndex: "10000",
		},

		// add separator line style
		[`.${CLASS_SEPARATOR_LINE}`]: {
			flex: "0 0 auto",
			margin: "0",
			padding: "0",
			border: "0",
			borderTopStyle: "solid",
			borderWidth: "1px",
			alignSelf: "stretch",
		},
		[`.${CLASS_SEPARATOR_LINE_VERT}`]: {
			borderTopStyle: "none",
			borderLeftStyle: "solid",
			borderWidth: "1px",
		},
		[`.${CLASS_SEPARATOR_SPACER}`]: {
			flex: "0 0 auto",
			width: "1px", // actual size set inline
			height: "1px",
			alignSelf: "center",
		},

		// add custom toggle style
		[`.${CLASS_UI}.${CLASS_TOGGLE}`]: {
			display: "inline-flex",
			alignItems: "center",
		},
		[`.${CLASS_UI}.${CLASS_TOGGLE}>input`]: {
			webkitAppearance: "none",
			mozAppearance: "none",
			appearance: "none",
		},
		[`.${CLASS_UI}.${CLASS_TOGGLE}.${CLASS_TOGGLE_TYPE.none}>input`]: {
			display: "none",
		},
		[`.${CLASS_UI}.${CLASS_TOGGLE}.${CLASS_TOGGLE_TYPE.checkbox}>input+label`]:
			{
				padding: "0 0 0 0.35rem",
			},
		[`.${CLASS_UI}.${CLASS_TOGGLE}.${CLASS_TOGGLE_TYPE.checkbox}>input`]: {
			margin: "2px",
			display: "inline-block",
			position: "relative",
			outlineOffset: "0",
			color: "inherit",
			borderStyle: "solid",
			borderWidth: "1px",
			borderColor: "inherit",
			borderRadius: "2px",
			background: "#fff",
			width: "1rem",
			height: "1rem",
			flexShrink: "0",
			padding: "0",
			cursor: "inherit",
		},
		[`.${CLASS_UI}.${CLASS_TOGGLE}.${CLASS_TOGGLE_TYPE.checkbox}>input:checked`]:
			{
				background: "currentColor",
				borderColor: "transparent",
			},
		[`.${CLASS_UI}.${CLASS_TOGGLE}.${CLASS_TOGGLE_TYPE.checkbox}>input:checked::after`]:
			{
				content: "''",
				boxSizing: "border-box",
				display: "block",
				position: "absolute",
				top: "0",
				left: ".25rem",
				height: ".65rem",
				width: ".4rem",
				transform: "rotate(45deg)",
				borderWidth: "0 2px 2px 0",
				borderStyle: "solid",
				borderColor: "#fff",
			},
		[`.${CLASS_UI}.${CLASS_TOGGLE}.${CLASS_TOGGLE_TYPE.switch}>input+label`]: {
			flexGrow: "1",
		},
		[`.${CLASS_UI}.${CLASS_TOGGLE}.${CLASS_TOGGLE_TYPE.switch}>input`]: {
			order: "2",
			width: "2.5rem",
			height: "1.5rem",
			flexShrink: "0",
			margin: "2px 2px 2px .35rem",
			display: "inline-block",
			position: "relative",
			outlineOffset: "0",
			color: "inherit",
			borderStyle: "solid",
			borderWidth: "1px",
			borderColor: "inherit",
			borderRadius: "1rem",
			background: "rgba(128,128,128,.3)",
			cursor: "inherit",
		},
		[`.${CLASS_UI}.${CLASS_TOGGLE}.${CLASS_TOGGLE_TYPE.switch}>input:checked`]:
			{
				background: "currentColor",
				borderColor: "transparent",
				opacity: "1",
				boxShadow: "none",
			},
		[`.${CLASS_UI}.${CLASS_TOGGLE}.${CLASS_TOGGLE_TYPE.switch}>input::after`]: {
			content: "''",
			display: "block",
			boxSizing: "border-box",
			position: "absolute",
			top: "calc(0.125rem - 1px)",
			left: ".125rem",
			height: "1.25rem",
			width: "1.25rem",
			borderRadius: "1rem",
			background: "#fff",
			boxShadow: "0 2px 4px rgba(0,0,0,.5)",
			transition: "all 0.1s ease",
		},
		[`.${CLASS_UI}.${CLASS_TOGGLE}.${CLASS_TOGGLE_TYPE.switch}>input:checked::after`]:
			{
				left: "1.05rem",
				borderColor: "transparent",
			},
	};
}
