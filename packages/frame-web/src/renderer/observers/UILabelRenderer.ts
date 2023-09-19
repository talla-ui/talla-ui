import {
	app,
	ManagedChangeEvent,
	RenderContext,
	StringConvertible,
	UIColor,
	UIIconResource,
	UILabel,
	UILabelStyle,
} from "@desk-framework/frame-core";
import {
	applyElementClassName,
	applyElementStyle,
	getCSSColor,
	getCSSLength,
} from "../../style/DOMStyle.js";
import { BaseObserver, getBaseStyleClass } from "./BaseObserver.js";

const CHEVRON_ICONS = {
	up: "@chevronUp",
	down: "@chevronDown",
	next: "@chevronNext",
	back: "@chevronBack",
};

/** @internal */
export class UILabelRenderer extends BaseObserver<UILabel> {
	override observe(observed: UILabel) {
		return super
			.observe(observed)
			.observePropertyAsync(
				"text",
				"icon",
				"bold",
				"italic",
				"color",
				"width",
				"labelStyle",
			);
	}

	protected override async handlePropertyChange(
		property: string,
		value: any,
		event?: ManagedChangeEvent,
	) {
		if (this.observed && this.element) {
			switch (property) {
				case "text":
				case "icon":
					this.scheduleUpdate(this.element);
					return;
				case "bold":
				case "italic":
				case "color":
				case "width":
				case "labelStyle":
					this.scheduleUpdate(undefined, this.element);
					return;
			}
		}
		await super.handlePropertyChange(property, value, event);
	}

	getOutput() {
		if (!this.observed) throw ReferenceError();
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
		if (label) {
			applyElementClassName(
				element,
				getBaseStyleClass(label.labelStyle) || UILabelStyle,
				undefined,
				true,
			);
			applyElementStyle(
				element,
				[
					label.labelStyle,
					{
						width: label.width,
						bold: label.bold,
						italic: label.italic,
						textColor: label.color,
					},
				],
				label.position,
				undefined,
				true,
			);
		}
	}

	updateContent(element: HTMLSpanElement) {
		if (!this.observed) return;
		setTextOrHtmlContent(element, this.observed);
	}
}

type TextContentProperties = {
	text?: StringConvertible;
	htmlFormat?: boolean;
	icon?: StringConvertible;
	iconSize?: string | number;
	iconMargin?: string | number;
	iconColor?: UIColor | string;
	chevron?: "up" | "down" | "back" | "next";
	chevronSize?: string | number;
	chevronColor?: UIColor | string;
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
	if (typeof icon === "string" && icon[0] === "@") {
		icon = app.theme?.icons.get(icon.slice(1));
	}
	let mirrorRTL = false;
	if (icon instanceof UIIconResource) {
		if (icon.isMirrorRTL()) mirrorRTL = true;
	}
	let size = getCSSLength(content.iconSize, "1.5rem");
	let color = content.iconColor ? getCSSColor(content.iconColor) : "";
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
