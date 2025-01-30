import { RenderContext, UIImage, ui } from "@talla-ui/core";
import { BaseObserver } from "./BaseObserver.js";
import { applyStyles } from "../../style/DOMStyle.js";

/** @internal */
export class UIImageRenderer extends BaseObserver<UIImage> {
	constructor(observed: UIImage) {
		super(observed);
		this.observeProperties("url", "style");
	}

	protected override propertyChange(property: string, value: any) {
		if (!this.element) return;
		switch (property) {
			case "url":
				this.scheduleUpdate(this.element);
				return;
			case "style":
				this.scheduleUpdate(undefined, this.element);
				return;
		}
		super.propertyChange(property, value);
	}

	getOutput() {
		let elt = document.createElement("img");
		let output = new RenderContext.Output(this.observed, elt);

		// emit event if image can't be loaded
		elt.onerror = () => {
			if (this.observed) this.observed.emit("LoadError");
		};

		// make (keyboard) focusable if needed
		if (this.observed.allowKeyboardFocus) elt.tabIndex = 0;
		else if (this.observed.allowFocus) elt.tabIndex = -1;
		return output;
	}

	override updateStyle(element: HTMLImageElement) {
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

	updateContent(element: HTMLImageElement) {
		element.src = String(this.observed.url || "");
	}
}
