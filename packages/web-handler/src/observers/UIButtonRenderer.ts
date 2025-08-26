import {
	NavigationContext,
	RenderContext,
	UI,
	UIButton,
	app,
} from "@talla-ui/core";
import { StringConvertible } from "@talla-ui/util";
import { applyStyles } from "../DOMStyle.js";
import { BaseObserver } from "./BaseObserver.js";
import { setTextOrHtmlContent } from "./UILabelRenderer.js";

interface HrefNavigationContext extends NavigationContext {
	getPathHref(path?: StringConvertible): string | undefined;
}

const BUTTON_STYLE = UI.styles.button.default;

/** @internal */
export class UIButtonRenderer extends BaseObserver<UIButton> {
	constructor(observed: UIButton) {
		super(observed);
		this.observeProperties(
			"text",
			"icon",
			"iconStyle",
			"chevron",
			"chevronStyle",
			"disabled",
			"pressed",
		);
	}

	protected override propertyChange(property: string, value: any) {
		if (!this.element) return;
		switch (property) {
			case "text":
			case "icon":
			case "iconStyle":
			case "chevron":
			case "chevronStyle":
				return this.scheduleUpdate(this.element);
		}
		super.propertyChange(property, value);
	}

	getOutput() {
		let button = this.observed;
		let isLink = button.accessibleRole === "link";
		let elt = document.createElement(isLink ? "a" : "button");
		if (!isLink) elt.type = "button";
		let output = new RenderContext.Output(button, elt);

		// make (keyboard) focusable
		elt.tabIndex = button.disableKeyboardFocus ? -1 : 0;

		// set href property if possible
		if (button.navigateTo !== undefined) {
			let navController = app.navigation as HrefNavigationContext | undefined;
			if (navController && typeof navController.getPathHref === "function") {
				let href = navController.getPathHref(button.getNavigationTarget());
				if (href !== undefined) (elt as HTMLAnchorElement).href = href;
			}
		}

		// handle direct clicks with `navigateTo` set
		elt.addEventListener("click", (e) => {
			if (button && button.navigateTo !== undefined) {
				if (
					(e as MouseEvent).ctrlKey ||
					(e as MouseEvent).altKey ||
					(e as MouseEvent).metaKey
				) {
					// assume OS handles key combo clicks,
					// don't treat as a click at all:
					e.stopPropagation();
					e.stopImmediatePropagation();
				} else {
					// use app to navigate instead, emit an event here:
					e.preventDefault();
					if (!button.disabled) {
						button.emit("Navigate");
					}
				}
			}
		});
		return output;
	}

	override onDOMEvent(_: Event, data: any) {
		if (this.observed?.disabled) return false;
		data.value = this.observed?.value;
	}

	override updateStyle(element: HTMLButtonElement) {
		// set disabled state
		let button = this.observed;
		element.disabled = !!button.disabled;
		if (button.disabled) element.setAttribute("aria-disabled", "true");
		else element.removeAttribute("aria-disabled");

		// set pressed state (true/false/undefined)
		if (button.pressed) element.setAttribute("aria-pressed", "true");
		else if (button.pressed === false)
			element.setAttribute("aria-pressed", "false");
		else element.removeAttribute("aria-pressed");

		// set CSS styles
		applyStyles(
			element,
			[BUTTON_STYLE, button.style],
			undefined,
			true,
			false,
			button.position,
		);
	}

	updateContent(element: HTMLButtonElement) {
		setTextOrHtmlContent(element, this.observed, true);
	}
}
