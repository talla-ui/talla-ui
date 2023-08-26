import {
	app,
	ManagedChangeEvent,
	RenderContext,
	StringConvertible,
	UIColor,
	UILabel,
	UITheme,
} from "desk-frame";
import { getCSSColor, getCSSLength } from "../../style/DOMStyle.js";
import { BaseObserver } from "./BaseObserver.js";

/** @internal */
export class UILabelRenderer extends BaseObserver<UILabel> {
	override observe(observed: UILabel) {
		return super
			.observe(observed)
			.observePropertyAsync(
				"text",
				"icon",
				"textStyle",
				"decoration",
				"disabled",
				"shrinkwrap"
			);
	}

	protected override async handlePropertyChange(
		property: string,
		value: any,
		event?: ManagedChangeEvent
	) {
		if (this.observed && this.element) {
			switch (property) {
				case "text":
				case "icon":
					this.scheduleUpdate(this.element);
					return;
				case "textStyle":
				case "decoration":
				case "disabled":
				case "shrinkwrap":
					this.scheduleUpdate(undefined, this.element);
					return;
			}
		}
		await super.handlePropertyChange(property, value, event);
	}

	getOutput() {
		if (!this.observed) throw ReferenceError();
		let elt = document.createElement(
			this.observed.headingLevel ? "h" + this.observed.headingLevel : "span"
		);
		let output = new RenderContext.Output(this.observed, elt);

		// make (keyboard) focusable if needed
		if (this.observed.allowKeyboardFocus) elt.tabIndex = 0;
		else if (this.observed.allowFocus) elt.tabIndex = -1;
		return output;
	}

	override updateStyle(element: HTMLElement) {
		let label = this.observed;
		if (!label) return;

		// set disabled state
		if (label.disabled) element.setAttribute("aria-disabled", "true");
		else element.removeAttribute("aria-disabled");

		// set style objects
		super.updateStyle(
			element,
			{
				textStyle: label.textStyle,
				decoration: label.decoration,
			},
			label.shrinkwrap
		);
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
	iconAfter?: boolean;
};

/** @internal Helper function to set the (text or html) content for given element */
export function setTextOrHtmlContent(
	element: HTMLElement,
	content: TextContentProperties
) {
	let text = content.text == null ? "" : String(content.text);
	if (!content.icon) {
		// just set text/html content
		if (content.htmlFormat) element.innerHTML = text;
		else element.textContent = text;
		return;
	}

	// use a wrapper to contain both the icon and the text
	let contentWrapper = document.createElement("span");
	contentWrapper.style.display = "flex";
	contentWrapper.style.flexDirection = "row";
	contentWrapper.style.alignItems = "center";
	contentWrapper.style.justifyContent = "space-around";
	contentWrapper.style.textOverflow = "inherit";
	try {
		// add icon element
		let icon = getIconElt(content);
		icon.style.order = content.iconAfter ? "2" : "0";
		contentWrapper.appendChild(icon);
	} catch (err: any) {
		let iconSource = String(content.icon);
		if (!_failedIconNotified[iconSource]) {
			_failedIconNotified[iconSource] = true;
			app.log.error(err);
		}
	}
	if (text) {
		// add margin element
		let margin = getCSSLength(content.iconMargin, ".5rem");
		let marginWrapper = document.createElement("span");
		marginWrapper.style.flex = "0 0 " + margin;
		marginWrapper.style.width = margin;
		marginWrapper.style.order = "1";
		contentWrapper.appendChild(marginWrapper);

		// add text element
		let textWrapper = document.createElement("span");
		textWrapper.style.flex = "1 0 0";
		textWrapper.style.order = content.iconAfter ? "0" : "2";
		textWrapper.style.textOverflow = "inherit";
		textWrapper.style.overflow = "hidden";
		if (content.htmlFormat) textWrapper.innerHTML = text;
		else textWrapper.textContent = text;
		contentWrapper.appendChild(textWrapper);

		// align icon to the left (ltr) if there's text next to it
		contentWrapper.style.justifyContent = "start";
	}
	element.innerHTML = "";
	element.appendChild(contentWrapper);
}
let _failedIconNotified: { [name: string]: true } = {};

const _memoizedIcons: { [memo: string]: HTMLElement } = {};

/** Memoized function to create an icon element for given icon name/content, size, and color */
function getIconElt(content: TextContentProperties) {
	let size = getCSSLength(content.iconSize, "auto");
	let color = content.iconColor ? getCSSColor(content.iconColor) : "";
	let iconSource = String(content.icon);
	let memo = iconSource + ":" + size + ":" + color;
	if (_memoizedIcons[memo]) {
		return _memoizedIcons[memo]!.cloneNode(true) as HTMLElement;
	}

	// not memoized yet, get HTML content and create element
	let temp = document.createElement("div");
	let iconContent = String(content.icon);
	if (iconContent[0] === "@")
		iconContent = String(UITheme.getIcon(iconContent.slice(1)));
	temp.innerHTML = iconContent.trim();
	let result: HTMLElement;
	let icon = temp.firstChild;
	if (!icon) icon = document.createTextNode("");
	if (String(icon.nodeName).toLowerCase() === "svg") {
		result = icon as HTMLElement;
		if (result.hasAttribute("stroke")) {
			result.style.stroke = color || "currentColor";
		} else {
			result.style.fill = color || "currentColor";
		}
		result.style.display = "inline-block";
		size = content.iconSize ? size : "1rem";
		result.style.height = "auto";
	} else {
		let iconWrapper = document.createElement("icon");
		iconWrapper.style.display = "inline-block";
		iconWrapper.appendChild(icon);
		if (content.iconSize) iconWrapper.style.fontSize = size;
		if (color) iconWrapper.style.color = color;
		result = iconWrapper;
	}
	result.style.flex = "0 0 " + size;
	result.style.width = size;
	_memoizedIcons[memo] = result.cloneNode(true) as HTMLElement;
	return result;
}
