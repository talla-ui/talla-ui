import {
	RenderContext,
	UIColor,
	UIIconResource,
	UIImage,
	app,
	ui,
} from "@talla-ui/core";
import type { StringConvertible } from "@talla-ui/util";
import { applyStyles, getCSSLength } from "../../style/DOMStyle.js";
import { BaseObserver } from "./BaseObserver.js";

type IconProperties = {
	icon?: StringConvertible;
	iconSize?: string | number;
	iconMargin?: string | number;
	iconColor?: UIColor;
};

/** @internal Memoized icon elements */
const _memoizedIcons: { [memo: string]: HTMLElement } = {};

/** @internal Helper function to create an icon element for given icon name/content, size, and color */
export function getIconElt(content: IconProperties) {
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
		elt.removeAttribute("width");
		elt.removeAttribute("height");
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

/** @internal */
export class UIImageRenderer extends BaseObserver<UIImage> {
	constructor(observed: UIImage) {
		super(observed);
		this.observeProperties("url", "icon", "iconColor", "style");
	}

	protected override propertyChange(property: string, value: any) {
		if (!this.element) return;
		switch (property) {
			case "url":
			case "icon":
			case "iconColor":
				this.scheduleUpdate(this.element);
				return;
			case "style":
				this.scheduleUpdate(undefined, this.element);
				return;
		}
		super.propertyChange(property, value);
	}

	getOutput() {
		let elt = document.createElement("figure");
		let output = new RenderContext.Output(this.observed, elt);

		// make (keyboard) focusable if needed
		if (this.observed.allowKeyboardFocus) elt.tabIndex = 0;
		else if (this.observed.allowFocus) elt.tabIndex = -1;
		return output;
	}

	override updateStyle(element: HTMLElement) {
		let image = this.observed;
		applyStyles(
			element,
			[
				ui.style.IMAGE,
				image.style,
				{
					width: image.width,
					minWidth: image.width,
					height: image.height,
					minHeight: image.height,
					grow: image.grow,
				},
			],
			undefined,
			false,
			false,
			image.position,
		);
	}

	updateContent(element: HTMLElement) {
		// clear any existing content
		element.innerHTML = "";

		// add image content
		if (this.observed.url) {
			let inner = document.createElement("img");
			inner.onerror = () => {
				if (this.observed) this.observed.emit("LoadError");
			};
			inner.src = String(this.observed.url || "");
			element.appendChild(inner);
		} else if (this.observed.icon) {
			let inner = getIconElt({
				icon: this.observed.icon,
				iconSize: this.observed.height || this.observed.width,
				iconColor: this.observed.iconColor,
			});
			element.appendChild(inner);
		}
	}
}
