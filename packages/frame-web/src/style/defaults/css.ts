/** @internal UI component class name */
export const CLASS_UI = "Desk__UI";
/** @internal Page root element class name */
export const CLASS_PAGE_ROOT = "Desk__Page";
/** @internal Modal root (shader) element class name */
export const CLASS_MODAL_SHADER = "Desk__ModalShader";
/** @internal Modal wrapper element class name */
export const CLASS_MODAL_WRAPPER = "Desk__ModalWrapper";
/** @internal Container separator element class name: horizontal or vertical line */
export const CLASS_SEPARATOR_LINE = "Desk__Sep--line";
/** @internal Container separator element class name: vertical line */
export const CLASS_SEPARATOR_LINE_VERT = "Desk__Sep--line-vert";
/** @internal Container separator element class name: spacer */
export const CLASS_SEPARATOR_SPACER = "Desk__Sep--space";
/** @internal Additional text control class name */
export const CLASS_TEXTCONTROL = "_Text";
/** @internal Additional container class name */
export const CLASS_CONTAINER = "_Container";
/** @internal Additional column class name */
export const CLASS_COLUMN = "_Column";
/** @internal Additional row class name */
export const CLASS_ROW = "_Row";
/** @internal Additional cell class name */
export const CLASS_CELL = "_Cell";
/** @internal Additional scroll container class name */
export const CLASS_SCROLL = "_Scroll";
/** @internal Additional toggle wrapper class name */
export const CLASS_TOGGLE_WRAPPER = "_Toggle";

/** @internal Returns an object with necessary global CSS classes */
export function makeBaseCSS() {
	return {
		// add UI component base styles
		[`.${CLASS_UI}`]: {
			display: "block",
			margin: "0",
			padding: "0",
			border: "0 solid transparent",
			cursor: "inherit",
			boxSizing: "border-box",
			whiteSpace: "pre",
			textOverflow: "ellipsis",
			textDecoration: "none",
			fontWeight: "normal",
		},
		[`.${CLASS_UI}.${CLASS_CONTAINER}`]: {
			position: "relative",
			display: "flex",
			textAlign: "start||left",
			alignItems: "stretch",
			flexDirection: "column",
			justifyContent: "flex-start",
			alignSelf: "stretch",
			flexGrow: "1",
			flexShrink: "1",
		},
		[`.${CLASS_UI}.${CLASS_ROW}`]: {
			flexDirection: "row",
			alignItems: "center",
			flexGrow: "0",
		},
		[`.${CLASS_UI}.${CLASS_COLUMN}`]: {
			alignItems: "center",
			flexGrow: "0",
		},
		[`.${CLASS_UI}.${CLASS_CELL}`]: {
			justifyContent: "center",
			alignItems: "center",
			overflow: "hidden",
			top: "0",
			minHeight: "0",
			flexShrink: "0",
		},

		// set sensible placeholder style
		[`input.${CLASS_UI}::placeholder`]: {
			color: "inherit",
			opacity: "0.5",
		},

		// CSS for alignment of elements within buttons/labels
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
			top: 0,
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
		[`.${CLASS_MODAL_SHADER}`]: {
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
		[`.${CLASS_MODAL_WRAPPER}`]: {
			flexDirection: "row",
			justifyContent: "center",
			alignContent: "center",
			display: "flex",
			position: "absolute",
			width: "100%",
			height: "100%",
		},
		[`.${CLASS_MODAL_WRAPPER}>.${CLASS_UI}`]: {
			zIndex: "10000",
		},

		// add separator styles
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
		[`.${CLASS_UI}.${CLASS_TOGGLE_WRAPPER}>input`]: {
			webkitAppearance: "none",
			mozAppearance: "none",
			appearance: "none",
			position: "relative",
			display: "inline-block",
			verticalAlign: "middle",
			top: "-0.1rem",
			left: "2px",
			outlineOffset: "0",
			color: "inherit",
			border: "1px solid currentcolor",
			borderRadius: "0",
			width: "1rem",
			height: "1rem",
			padding: "0",
			margin: "0",
			cursor: "inherit",
		},
		[`.${CLASS_UI}.${CLASS_TOGGLE_WRAPPER}>input:checked::after`]: {
			content: "''",
			boxSizing: "border-box",
			display: "block",
			position: "absolute",
			top: "0.015rem",
			left: ".25rem",
			height: ".7rem",
			width: ".4rem",
			transform: "rotate(45deg)",
			borderWidth: "0 2.5px 2.5px 0",
			borderStyle: "solid",
			borderColor: "inherit",
		},
	};
}
