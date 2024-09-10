import {
	NavigationContext,
	app,
	RenderContext,
	UIButton,
	ui,
	NavigationTarget,
} from "talla";
import { applyStyles } from "../../style/DOMStyle.js";
import { BaseObserver, getBaseStyleClass } from "./BaseObserver.js";
import { setTextOrHtmlContent } from "./UILabelRenderer.js";

interface HrefNavigationContext extends NavigationContext {
	getPathHref(path?: NavigationTarget): string | undefined;
}

/** @internal */
export class UIButtonRenderer extends BaseObserver<UIButton> {
	constructor(observed: UIButton) {
		super(observed);
		this.observeProperties(
			"label",
			"icon",
			"chevron",
			"disabled",
			"width",
			"pressed",
			"style",
		);
	}

	protected override propertyChange(property: string, value: any) {
		if (!this.element) return;
		switch (property) {
			case "label":
			case "icon":
			case "chevron":
				this.scheduleUpdate(this.element);
				return;
			case "disabled":
			case "pressed":
			case "width":
			case "style":
				this.scheduleUpdate(undefined, this.element);
				return;
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
			button,
			element,
			getBaseStyleClass(button.style) ||
				(button.primary ? ui.style.BUTTON_PRIMARY : ui.style.BUTTON),
			undefined,
			true,
			false,
			[
				button.style,
				button.width !== undefined
					? { width: button.width, minWidth: 0 }
					: undefined,
			],
			button.position,
			undefined,
		);
	}

	updateContent(element: HTMLButtonElement) {
		let button = this.observed;
		setTextOrHtmlContent(
			element,
			{
				text: button.label,
				icon: button.icon,
				iconSize: button.iconSize,
				iconColor: button.iconColor,
				iconMargin: button.iconMargin,
				chevron: button.chevron,
				chevronSize: button.chevronSize,
				chevronInset: button.chevronInset,
				chevronColor: button.chevronColor,
			},
			true,
		);
	}
}
