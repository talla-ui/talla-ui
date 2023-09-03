import {
	ActivationPath,
	app,
	ManagedChangeEvent,
	RenderContext,
	UIButton,
	UIComponentEvent,
} from "desk-frame";
import { BaseObserver } from "./BaseObserver.js";
import { setTextOrHtmlContent } from "./UILabelRenderer.js";

interface HrefActivationPath extends ActivationPath {
	getPathHref(path?: string): string;
}

/** @internal */
export class UIButtonRenderer extends BaseObserver<UIButton> {
	override observe(observed: UIButton) {
		return super
			.observe(observed)
			.observePropertyAsync(
				"label",
				"icon",
				"textStyle",
				"decoration",
				"disabled",
				"shrinkwrap",
			);
	}

	protected override async handlePropertyChange(
		property: string,
		value: any,
		event?: ManagedChangeEvent,
	) {
		if (this.observed && this.element) {
			switch (property) {
				case "label":
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

	onSelect(e: UIComponentEvent) {
		if (e.source === this.observed && this.element) {
			this.element.dataset.selected = "selected";
		}
	}

	onDeselect(e: UIComponentEvent) {
		if (e.source === this.observed && this.element) {
			delete this.element.dataset.selected;
		}
	}

	getOutput() {
		if (!this.observed) throw ReferenceError();
		let isLink = this.observed.accessibleRole === "link";
		let elt = document.createElement(isLink ? "a" : "button");
		if (!isLink) elt.type = "button";
		let output = new RenderContext.Output(this.observed, elt);

		// make (keyboard) focusable
		elt.tabIndex = this.observed.disableKeyboardFocus ? -1 : 0;

		// set href property if possible
		if (this.observed.navigateTo) {
			let activationPath = app.activities.activationPath as
				| HrefActivationPath
				| undefined;
			if (activationPath && typeof activationPath.getPathHref === "function") {
				(elt as HTMLAnchorElement).href = activationPath.getPathHref(
					String(this.observed.getNavigationTarget()),
				);
			}
		}

		// handle direct clicks with `navigateTo` set
		elt.addEventListener("click", (e) => {
			if (this.observed && this.observed.navigateTo) {
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
					if (!this.observed.disabled) {
						this.observed.emit("Navigate");
					}
				}
			}
		});
		return output;
	}

	override updateStyle(element: HTMLButtonElement) {
		let button = this.observed;
		if (!button) return;

		// set disabled state
		element.disabled = !!button.disabled;
		if (button.disabled) element.setAttribute("aria-disabled", "true");
		else element.removeAttribute("aria-disabled");

		// set style objects
		super.updateStyle(
			element,
			{
				textStyle: button.textStyle,
				decoration: button.decoration,
			},
			button.shrinkwrap,
		);
	}

	updateContent(element: HTMLButtonElement) {
		if (!this.observed) return;
		setTextOrHtmlContent(element, {
			text: this.observed.label,
			icon: this.observed.icon,
			iconSize: this.observed.iconSize,
			iconAfter: this.observed.iconAfter,
			iconColor: this.observed.iconColor,
			iconMargin: this.observed.iconMargin,
		});
	}
}
