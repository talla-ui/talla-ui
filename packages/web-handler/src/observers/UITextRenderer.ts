import { RenderContext, UI, UIText } from "@talla-ui/core";
import type { StringConvertible } from "@talla-ui/util";
import { applyStyles, getCSSLength } from "../DOMStyle.js";
import { CLASS_TEXT } from "../defaults/css.js";
import { BaseObserver } from "./BaseObserver.js";
import { getIconElt } from "./UIImageRenderer.js";

type TextContentProperties = {
	text?: StringConvertible;
	htmlFormat?: boolean;
	icon?: StringConvertible;
	iconStyle?: UIText.IconStyle;
	chevron?: "up" | "down" | "back" | "next";
	chevronStyle?: UIText.IconStyle;
};

const CHEVRON_ICONS = {
	up: UI.icons.chevronUp,
	down: UI.icons.chevronDown,
	next: UI.icons.chevronNext,
	back: UI.icons.chevronBack,
};

/** @internal */
export class UITextRenderer extends BaseObserver<UIText> {
	/** Defaults for default icon style, applied to new {@link WebTheme} instances */
	static readonly ICON_DEFAULTS = {
		size: 20,
		margin: 4,
	};

	/** Default icon size and margin, updated by {@link setWebTheme} */
	static defaultIconStyle: UIText.IconStyle = {
		size: 20,
		margin: 4,
	};

	constructor(observed: UIText) {
		super(observed);
		this.observeProperties("text", "icon", "iconStyle");
	}

	protected override propertyChange(property: string, value: any) {
		if (!this.element) return;
		switch (property) {
			case "text":
			case "icon":
			case "iconStyle":
				return this.scheduleUpdate(this.element);
		}
		super.propertyChange(property, value);
	}

	getOutput() {
		let elt = document.createElement(
			this.observed.headingLevel ? "h" + this.observed.headingLevel : "span",
		);
		let output = new RenderContext.Output(this.observed, elt);

		// make (keyboard) focusable if needed
		if (this.observed.allowKeyboardFocus) elt.tabIndex = 0;
		else if (this.observed.allowFocus) elt.tabIndex = -1;

		// show tooltip when text is truncated
		elt.onmouseenter = () => {
			elt.title = (elt.scrollWidth > elt.clientWidth && elt.textContent) || "";
		};
		return output;
	}

	override updateStyle(element: HTMLElement) {
		let text = this.observed;
		let style = text.style;
		if (text.selectable) {
			style = { ...style, userTextSelect: true };
		}
		applyStyles(
			element,
			undefined,
			style,
			CLASS_TEXT,
			true,
			false,
			text.position,
		);
	}

	updateContent(element: HTMLSpanElement) {
		setTextOrHtmlContent(element, this.observed);
	}
}

/** @internal Helper function to set the (text or html) content for given element */
export function setTextOrHtmlContent(
	element: HTMLElement,
	content: TextContentProperties,
) {
	let text = content.text == null ? "" : String(content.text);
	if (!content.icon && !content.chevron) {
		// just set text/html content
		if (content.htmlFormat) element.innerHTML = text;
		else element.textContent = text;
		return;
	}
	element.innerHTML = "";

	let iconPosition = content.iconStyle?.position;
	let isVertical = iconPosition === "top" || iconPosition === "bottom";
	let isAfter = iconPosition === "end" || iconPosition === "bottom";

	// create icon element, if any
	let iconNode: HTMLElement | undefined;
	if (content.icon) {
		let iconElt = getIconElt(content.icon, content.iconStyle);
		if (isVertical) {
			// wrap icon in a block-level span so it forces a new line,
			// while the icon inside remains inline (respects text-align)
			let wrapper = document.createElement("span");
			wrapper.style.display = "block";
			iconElt.style.top = "0";
			iconElt.style.height = "";
			wrapper.appendChild(iconElt);
			iconNode = wrapper;
		} else {
			iconNode = iconElt;
		}
		if (text) {
			let dir: keyof CSSStyleDeclaration = isVertical
				? isAfter
					? "marginTop"
					: "marginBottom"
				: isAfter
					? "marginInlineStart"
					: "marginInlineEnd";
			iconNode.style[dir] = getCSSLength(
				content.iconStyle?.margin ?? UITextRenderer.defaultIconStyle.margin,
				0,
			);
		}
	}

	// create text element (if there's an icon, wrap in span)
	let textElt: HTMLElement | undefined;
	if (text) {
		let textWrapper = document.createElement("span");
		if (content.htmlFormat) textWrapper.innerHTML = text;
		else textWrapper.textContent = text;
		textElt = textWrapper;
	}

	// append icon and text in correct order
	if (isAfter) {
		if (textElt) element.appendChild(textElt);
		if (iconNode) element.appendChild(iconNode);
	} else {
		if (iconNode) element.appendChild(iconNode);
		if (textElt) element.appendChild(textElt);
	}

	// add chevron, if any
	if (content.chevron) {
		let chevronStyle = content.chevronStyle;
		let width = getCSSLength(
			chevronStyle?.size || UITextRenderer.defaultIconStyle.size,
			"1rem",
		);
		if (iconNode && isVertical) {
			iconNode.style.paddingInlineEnd = width;
		}
		let chevronSpacer = document.createElement("span");
		chevronSpacer.style.display = "inline-block";
		chevronSpacer.style.width = width;
		element.appendChild(chevronSpacer);
		let chevronWrapper = document.createElement("span");
		chevronWrapper.className = "_chevron-wrapper";
		chevronWrapper.style.insetInlineEnd = getCSSLength(
			chevronStyle?.margin,
			"0.375rem",
		);
		let chevronElement = getIconElt(
			CHEVRON_ICONS[content.chevron],
			chevronStyle,
		);
		chevronWrapper.appendChild(chevronElement);
		element.appendChild(chevronWrapper);
	}
}
