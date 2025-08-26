import { RenderContext, UI, UILabel } from "@talla-ui/core";
import type { StringConvertible } from "@talla-ui/util";
import { applyStyles, getCSSLength } from "../DOMStyle.js";
import { BaseObserver } from "./BaseObserver.js";
import { getIconElt } from "./UIImageRenderer.js";

const LABEL_STYLE = UI.styles.label.default;

type TextContentProperties = {
	text?: StringConvertible;
	htmlFormat?: boolean;
	icon?: StringConvertible;
	iconStyle?: UILabel.IconStyle;
	chevron?: "up" | "down" | "back" | "next";
	chevronStyle?: UILabel.IconStyle;
};

const CHEVRON_ICONS = {
	up: UI.icons.chevronUp,
	down: UI.icons.chevronDown,
	next: UI.icons.chevronNext,
	back: UI.icons.chevronBack,
};

/** @internal */
export class UILabelRenderer extends BaseObserver<UILabel> {
	constructor(observed: UILabel) {
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
		return output;
	}

	override updateStyle(element: HTMLElement) {
		let label = this.observed;
		applyStyles(
			element,
			[
				LABEL_STYLE,
				label.style,
				label.selectable ? { userTextSelect: true } : undefined,
			],
			undefined,
			true,
			false,
			label.position,
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
	balanceSpace?: boolean,
) {
	let text = content.text == null ? "" : String(content.text);
	if (!content.icon && !content.chevron) {
		// just set text/html content
		if (content.htmlFormat) element.innerHTML = text;
		else element.textContent = text;
		return;
	}
	element.innerHTML = "";

	// add icon element
	if (content.icon) {
		let icon = getIconElt(content.icon, content.iconStyle);
		element.appendChild(icon);
	}

	// add margin element
	if (content.icon && content.text) {
		if (content.iconStyle?.margin) {
			let margin = getCSSLength(content.iconStyle.margin, 0);
			let marginWrapper = document.createElement("span");
			marginWrapper.style.width = margin;
			marginWrapper.style.display = "inline-block";
			element.appendChild(marginWrapper);
		} else {
			element.appendChild(document.createTextNode("  "));
		}
	}

	// add text element
	if (text) {
		let textWrapper = document.createElement("span");
		if (content.htmlFormat) textWrapper.innerHTML = text;
		else textWrapper.textContent = text;
		element.appendChild(textWrapper);

		// add space after text if needed (for buttons)
		if (balanceSpace) {
			if (content.icon) {
				element.appendChild(document.createTextNode(" "));
			}
			if (content.chevron) {
				element.insertBefore(document.createTextNode(" "), textWrapper);
			}
		}
	}

	// add chevron, if any
	if (content.chevron) {
		let chevronStyle = content.chevronStyle;
		let width = getCSSLength(chevronStyle?.size, "1rem");
		let chevronSpacer = document.createElement("span");
		chevronSpacer.style.display = "inline-block";
		chevronSpacer.style.width = width;
		element.appendChild(chevronSpacer);
		let chevronWrapper = document.createElement("span");
		chevronWrapper.className = "_chevron-wrapper";
		if (chevronStyle?.margin !== undefined) {
			chevronWrapper.style.insetInlineEnd = getCSSLength(chevronStyle.margin);
		}
		let chevronElement = getIconElt(
			CHEVRON_ICONS[content.chevron],
			chevronStyle,
		);
		chevronWrapper.appendChild(chevronElement);
		element.appendChild(chevronWrapper);
	}
}
