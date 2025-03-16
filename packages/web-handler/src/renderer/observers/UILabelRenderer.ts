import {
	RenderContext,
	StringConvertible,
	ui,
	UIColor,
	UILabel,
} from "@talla-ui/core";
import {
	applyStyles,
	getCSSLength,
	getLabelDimOpacity,
} from "../../style/DOMStyle.js";
import { BaseObserver } from "./BaseObserver.js";
import { getIconElt } from "./UIImageRenderer.js";

type TextContentProperties = {
	text?: StringConvertible;
	htmlFormat?: boolean;
	icon?: StringConvertible;
	iconSize?: string | number;
	iconMargin?: string | number;
	iconColor?: UIColor;
	chevron?: "up" | "down" | "back" | "next";
	chevronSize?: string | number;
	chevronInset?: string | number;
	chevronColor?: UIColor;
};

const CHEVRON_ICONS = {
	up: ui.icon.CHEVRON_UP,
	down: ui.icon.CHEVRON_DOWN,
	next: ui.icon.CHEVRON_NEXT,
	back: ui.icon.CHEVRON_BACK,
};

/** @internal */
export class UILabelRenderer extends BaseObserver<UILabel> {
	constructor(observed: UILabel) {
		super(observed);
		this.observeProperties(
			"text",
			"icon",
			"bold",
			"italic",
			"color",
			"padding",
			"width",
			"dim",
			"fontSize",
			"align",
			"style",
		);
	}

	protected override propertyChange(property: string, value: any) {
		if (!this.element) return;
		switch (property) {
			case "text":
			case "icon":
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
		let opacity = label.dim;
		if (opacity === true) opacity = getLabelDimOpacity();
		else if (opacity === false) opacity = 1;
		applyStyles(
			element,
			[
				ui.style.LABEL,
				label.style,
				{
					width: label.width,
					minWidth: label.width,
					grow: label.grow,
					padding: label.padding,
					bold: label.bold,
					italic: label.italic,
					textColor: label.color,
					fontSize: label.fontSize,
					textAlign: label.align,
					opacity,
					lineBreakMode: label.wrap ? "pre-wrap" : undefined,
					userSelect: label.selectable || undefined,
				},
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
		let icon = getIconElt(content);
		element.appendChild(icon);
	}

	// add margin element
	if (content.icon && content.text) {
		if (content.iconMargin) {
			let margin = getCSSLength(content.iconMargin, 0);
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
		let width = getCSSLength(content.chevronSize, "1rem");
		let chevronSpacer = document.createElement("span");
		chevronSpacer.style.display = "inline-block";
		chevronSpacer.style.width = width;
		element.appendChild(chevronSpacer);
		let chevronWrapper = document.createElement("span");
		chevronWrapper.className = "_chevron-wrapper";
		if (content.chevronInset !== undefined) {
			chevronWrapper.style.insetInlineEnd = getCSSLength(content.chevronInset);
		}
		let chevronElement = getIconElt({
			icon: CHEVRON_ICONS[content.chevron],
			iconSize: content.chevronSize,
			iconColor: content.chevronColor,
		});
		chevronWrapper.appendChild(chevronElement);
		element.appendChild(chevronWrapper);
	}
}
