import {
	app,
	RenderContext,
	StringConvertible,
	ui,
	UIColor,
	UIIconResource,
	UILabel,
} from "@desk-framework/frame-core";
import { applyStyles, getCSSLength } from "../../style/DOMStyle.js";
import { BaseObserver, getBaseStyleClass } from "./BaseObserver.js";

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
			"width",
			"dim",
			"style",
		);
	}

	protected override propertyChange(property: string, value: any) {
		if (!this.element) return;
		switch (property) {
			case "text":
			case "icon":
				this.scheduleUpdate(this.element);
				return;
			case "bold":
			case "italic":
			case "color":
			case "width":
			case "dim":
			case "style":
				this.scheduleUpdate(undefined, this.element);
				return;
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
			label,
			element,
			getBaseStyleClass(label.style) ||
				(label.title
					? ui.style.LABEL_TITLE
					: label.small
						? ui.style.LABEL_SMALL
						: ui.style.LABEL),
			undefined,
			true,
			false,
			[
				label.style,
				{
					width: label.width,
					bold: label.bold,
					italic: label.italic,
					textColor: label.color,
					opacity:
						label.dim === true ? 0.5 : label.dim === false ? 1 : label.dim,
					lineBreakMode: label.wrap ? "pre-wrap" : undefined,
					userSelect: label.selectable || undefined,
				},
			],
			label.position,
			undefined,
		);
	}

	updateContent(element: HTMLSpanElement) {
		setTextOrHtmlContent(element, this.observed);
	}
}

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
		try {
			let icon = getIconElt(content);
			element.appendChild(icon);
		} catch (err: any) {
			let iconSource = String(content.icon);
			if (!_failedIconNotified[iconSource]) {
				_failedIconNotified[iconSource] = true;
				app.log.error(err);
			}
		}
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
let _failedIconNotified: { [name: string]: true } = {};

const _memoizedIcons: { [memo: string]: HTMLElement } = {};

/** Memoized function to create an icon element for given icon name/content, size, and color */
function getIconElt(content: TextContentProperties) {
	let icon = content.icon;
	let mirrorRTL = false;
	if (icon instanceof UIIconResource) {
		if (icon.isMirrorRTL()) mirrorRTL = true;
	}
	let size = getCSSLength(content.iconSize ?? app.theme?.iconSize, "1.5rem");
	let color = content.iconColor ? String(content.iconColor) : "";
	let iconSource = String(icon || "");
	let memo = iconSource + ":" + size + ":" + color;
	if (_memoizedIcons[memo]) {
		return _memoizedIcons[memo]!.cloneNode(true) as HTMLElement;
	}

	// not memoized yet, get HTML content and create element
	let temp = document.createElement("div");
	temp.innerHTML = iconSource.trim();
	let iconElement = temp.firstChild;
	let iconWrapper = document.createElement("icon");
	if (color) iconWrapper.style.color = color;
	if (mirrorRTL) iconWrapper.className = "_RTL-flip";
	if (!iconElement) iconElement = document.createTextNode("");
	if (String(iconElement.nodeName).toLowerCase() === "svg") {
		let elt = iconElement as HTMLElement;
		if (elt.hasAttribute("stroke")) {
			elt.style.stroke = "currentColor";
		} else {
			elt.style.fill = "currentColor";
		}
		elt.style.display = "inline-block";
		elt.style.height = "100%";
	} else {
		iconWrapper.style.fontSize = size;
	}
	iconWrapper.style.width = size;
	iconWrapper.style.height = size;
	iconWrapper.appendChild(iconElement);
	_memoizedIcons[memo] = iconWrapper.cloneNode(true) as HTMLElement;
	return iconWrapper;
}
