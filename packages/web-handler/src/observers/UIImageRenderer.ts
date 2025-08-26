import {
	RenderContext,
	UI,
	UIIconResource,
	UIImage,
	UILabel,
	UIStyle,
} from "@talla-ui/core";
import type { StringConvertible } from "@talla-ui/util";
import { applyStyles, getCSSLength } from "../DOMStyle.js";
import { BaseObserver } from "./BaseObserver.js";

const IMAGE_STYLE = UI.styles.image.default;

/** @internal Memoized icon elements */
const _memoizedIcons: { [memo: string]: HTMLElement } = {};

/** @internal Helper function to create an icon element for given icon name/content, size, and color */
export function getIconElt(
	icon?: StringConvertible,
	style?: UILabel.IconStyle,
) {
	let mirrorRTL = false;
	if (icon instanceof UIIconResource) {
		if (icon.isMirrorRTL()) mirrorRTL = true;
	}
	let size = getCSSLength(
		style?.size ?? UIStyle.defaultOptions.iconSize,
		"1.5rem",
	);
	let color = style?.color ? String(style.color) : "";
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
		this.observeProperties("source");
	}

	protected override propertyChange(property: string, value: any) {
		if (!this.element) return;
		switch (property) {
			case "source":
				this.scheduleUpdate(this.element);
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
		let isIcon = image.source instanceof UIIconResource;
		applyStyles(
			element,
			[
				IMAGE_STYLE,
				isIcon
					? {
							shrink: 0,
							width: UIStyle.defaultOptions.iconSize,
							height: UIStyle.defaultOptions.iconSize,
						}
					: undefined,
				image.style,
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
		let image = this.observed;
		if (image.source instanceof UIIconResource) {
			let inner = getIconElt(image.source, { size: "100%" });
			element.appendChild(inner);
			image.emit("Load");
		} else {
			let inner = document.createElement("img");
			inner.onload = () => {
				image.emit("Load");
			};
			inner.onerror = () => {
				image.emit("LoadError");
			};
			inner.src = String(image.source || "");
			element.appendChild(inner);
		}
	}
}
