/** @internal UI element class name */
export const CLASS_UI = "WebHandler__UI";
/** @internal Page root element class name */
export const CLASS_PAGE_ROOT = "WebHandler__Pg";
/** @internal Modal/overlay root (shader) element class name */
export const CLASS_OVERLAY_SHADER = "WebHandler__Ovl";
/** @internal Modal/overlay wrapper element class name */
export const CLASS_OVERLAY_WRAPPER = "__Wr";
/** @internal Container separator element class name: horizontal or vertical line */
export const CLASS_SEPARATOR_LINE = "__Sp-l";
/** @internal Container separator element class name: vertical line */
export const CLASS_SEPARATOR_LINE_VERT = "__Sp-lv";
/** @internal Container separator element class name: spacer */
export const CLASS_SEPARATOR_SPACER = "__Sp";
/** @internal Additional text control class name */
export const CLASS_TEXTCONTROL = "__T";
/** @internal Additional container class name */
export const CLASS_CONTAINER = "__C";
/** @internal Additional column class name */
export const CLASS_COLUMN = "__CC";
/** @internal Additional row class name */
export const CLASS_ROW = "__CR";
/** @internal Additional cell class name */
export const CLASS_CELL = "__Cl";
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
export function makeBaseCSS() {
	return {
		// add UI element base styles
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
		[`.${CLASS_UI}.${CLASS_CELL}`]: {
			alignSelf: "stretch",
			justifyContent: "center",
			overflow: "hidden",
			top: "0",
			minHeight: "0",
			flexGrow: "1",
			zIndex: "0", // every cell has its own stacking context
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
		},
		[`.${CLASS_UI} figure>img`]: {
			display: "block",
			width: "100%",
			height: "100%",
			objectFit: "cover",
		},

		// CSS for alignment of elements within buttons/labels
		[`button.${CLASS_UI}`]: {
			position: "relative",
			overflow: "hidden",
		},
		[`.${CLASS_UI} icon`]: {
			display: "inline-flex",
			alignItems: "center",
			justifyContent: "center",
			verticalAlign: "middle",
		},
		[`.${CLASS_UI} icon:not(:last-child)`]: {
			paddingBottom: "0.125em",
		},
		[`.${CLASS_UI}>._chevron-wrapper`]: {
			display: "inline-flex",
			alignItems: "center",
			position: "absolute",
			insetInlineEnd: "1ex",
			top: "0",
			height: "100%",
		},

		// flip icons in RTL mode
		[`[dir="rtl"] ._RTL-flip`]: {
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
			contain: "strict",
			display: "flex",
			flexDirection: "column",
			cursor: "default",
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

		// add separator line styles
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

		// add custom toggle styles
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
