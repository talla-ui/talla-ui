import { UIStyle } from "desk-frame";

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
/** @internal Toggle custom class name */
export const CLASS_TOGGLE = "Desk__Toggle";

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
			textOverflow: "ellipsis",
			textDecoration: "none",
		},
		[`.${CLASS_UI}.${UIStyle.Container.getIds().join(".")}`]: {
			position: "relative",
			display: "flex",
			textAlign: "start||left",
		},
		[`.${CLASS_UI}.${UIStyle.Label.getIds().join(".")}`]: {
			maxWidth: "100%",
			cursor: "inherit",
		},
		[`.${CLASS_UI}.${UIStyle.Label.getIds().join(".")}>icon`]: {
			overflow: "visible",
		},

		// fix vertical alignment of text within <a> button
		[`a.${CLASS_UI}`]: {
			display: "flex",
			flexDirection: "column",
			justifyContent: "center",
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
		[`.${CLASS_TOGGLE}>input`]: {
			webkitAppearance: "none",
			mozAppearance: "none",
			appearance: "none",
			position: "relative",
			display: "inline-block",
			verticalAlign: "middle",
			top: "-0.1rem",
			border: "1px solid transparent",
			background: "transparent",
			width: "1rem",
			height: "1rem",
			margin: "0",
			padding: "0",
			cursor: "pointer",
		},
		[`.${CLASS_TOGGLE}>input:checked`]: {
			background: "#333",
		},
		[`.${CLASS_TOGGLE}>input:checked::after`]: {
			content: "''",
			boxSizing: "border-box",
			display: "block",
			position: "absolute",
			top: "0",
			left: ".25rem",
			height: ".75rem",
			width: ".375rem",
			transform: "rotate(45deg)",
			borderBottom: ".125rem solid #fff",
			borderRight: ".125rem solid #fff",
		},
		[`.${CLASS_TOGGLE}>input[disabled]`]: {
			opacity: ".5",
			cursor: "default",
		},
		[`.${CLASS_TOGGLE}>input[disabled]+label`]: {
			opacity: ".5",
		},
		[`.${CLASS_TOGGLE}>input:not([disabled])+label`]: {
			cursor: "pointer",
		},
	};
}
