import { RenderContext, UIContainer, UIElement } from "@talla-ui/core";

/** Running ID for generated elements */
let _uid = 1;

/** Last focused element, if any */
let lastFocusedElement: TestOutputElement | undefined;

/** Helper function to recursively match object values */
function _matchAll(a: any, b: any): boolean {
	if (a == b) return true;
	if (
		a != null &&
		b != null &&
		typeof a === "object" &&
		typeof b === "object"
	) {
		for (let key in b) {
			if (!_matchAll(a[key], b[key])) return false;
		}
		return true;
	}
	return false;
}

/** A class that represents a rendered output element */
export class TestOutputElement {
	/** Creates a new output element with the provided type */
	constructor(type: TestOutputElement.TypeString) {
		this.type = type;
	}

	/** A unique ID for this element, which can be used to check for unnecessary re-rendering */
	readonly uid = _uid++;

	/** The UI element type that rendered this output element, one of {@link TestOutputElement.TypeString TypeString} values */
	readonly type: TestOutputElement.TypeString;

	/** The parent element, if any, as rendered by a container UI element */
	parent?: TestOutputElement;

	/** A reference back to the rendered output object */
	output?: RenderContext.Output & { element: TestOutputElement };

	/** UI element name, if any */
	name?: string;

	/** True if input has been disabled for a control element */
	disabled?: boolean;

	/** True if text input has been marked as readonly */
	readOnly?: boolean;

	/** True if a button is visibly selected (pressed) */
	pressed?: boolean;

	/** The content of a text field input element */
	value?: string;

	/** The checked state of a toggle element */
	checked?: boolean;

	/** The rendered text content of an element: text element, button, toggle, or text field placeholder */
	text?: string;

	/** A string representation of the icon as rendered for text elements and buttons */
	icon?: string;

	/** The chevron direction (string) for button elements */
	chevron?: string;

	/** The URL for an image element */
	imageUrl?: string;

	/** The WAI-ARIA role for this element, if any */
	accessibleRole?: string;

	/** The WAI-ARIA label text for this element, if any */
	accessibleLabel?: string;

	/** True if this element can be focused on click, or call to {@link TestOutputElement.focus focus()} */
	focusable?: boolean;

	/**
	 * Returns true if this element currently has input focus
	 * - Use the {@link TestOutputElement.focus focus()} (or {@link TestOutputElement.click click()}) and {@link TestOutputElement.blur blur()} methods to control global focus selection
	 */
	hasFocus() {
		return this === lastFocusedElement;
	}

	/** Variant style flags, if any (for button and text field elements) */
	variant?: Record<string, boolean | undefined>;

	/**
	 * Style overrides applied to this element
	 * - Styles are copied from {@link UIElement.style}.
	 */
	style: Record<string, any> = {};

	/**
	 * Position options applied to this element
	 * - Position is copied from {@link UIElement.position}.
	 */
	position?: UIElement.Position;

	/**
	 * Layout options applied to this element (containers only)
	 * - Layout is copied from {@link UIContainer.layout}.
	 */
	layout?: UIContainer.Layout;

	/** A list of all nested content elements, for containers */
	content: TestOutputElement[] = [];

	/**
	 * Simulates a user click or tap event
	 * - This method sends `mousedown`, `mouseup`, and `click` events immediately after each other.
	 * - This method also takes care of switching `toggle` checked states, and sets focus on a (parent) focusable element.
	 * - An error is thrown if the element is hidden or currently not part of rendered output (see {@link isOutput()}).
	 */
	click() {
		if (!this.isOutput()) {
			throw Error("Clicked element is not rendered");
		}

		this.sendPlatformEvent("mousedown");
		let emitChange = false;
		if (this.type === "toggle" && !this.disabled) {
			emitChange = true;
			this.checked = !this.checked;
		}

		// set focus to element or one of its parents, if needed
		if (!this.disabled) {
			let current: TestOutputElement | undefined = this;
			while (current) {
				if (current.focusable) {
					current.focus();
					break;
				}
				current = current.parent;
			}
		}

		this.sendPlatformEvent("mouseup");
		this.sendPlatformEvent("click");
		if (emitChange) this.sendPlatformEvent("change");
		return this;
	}

	/**
	 * Simulates a user double-click event
	 * - This method sends `mousedown`, `mouseup`, `click`, `mousedown`, `mouseup`, `click`, and `dblclick` events immediately after each other.
	 * - This method also takes care of switching `toggle` checked states, and sets focus on a (parent) focusable element.
	 * - An error is thrown if the element is hidden or currently not part of rendered output (see {@link isOutput()}).
	 */
	doubleClick() {
		this.click();
		this.click();
		this.sendPlatformEvent("dblclick");
		return this;
	}

	/**
	 * Simulates text input on a text field element
	 * - This method sets input focus on a text field, sets its value to the provided text, and sends the `input` platform event.
	 * - Nothing happens if the element isn't a text field.
	 * @param text The new text value
	 */
	setValue(text: string) {
		if (this.type !== "textfield" && this.type !== "textarea") return this;
		this.focus();
		this.value = String(text);
		this.sendPlatformEvent("input");
		return this;
	}

	/**
	 * Sets input focus on this element
	 * - This method removes focus from the currently focused element if necessary, and then sends a `focusin` event.
	 * - Nothing happens if the element is already focused or if the element isn't part of the currently rendered output (see {@link isOutput()}).
	 */
	focus() {
		if (this === lastFocusedElement || !this.focusable || !this.isOutput())
			return this;
		if (lastFocusedElement) lastFocusedElement.blur();
		lastFocusedElement = this;
		this.sendPlatformEvent("focusin");
		return this;
	}

	/**
	 * Removes input focus from this element
	 * - This method sends a `focusout` event, if the element is currently focused and part of rendered output (see {@link isOutput()})
	 */
	blur() {
		if (this !== lastFocusedElement) return this;
		if (lastFocusedElement === this) lastFocusedElement = undefined;
		if (this.isOutput()) {
			this.sendPlatformEvent("focusout");
		}
		return this;
	}

	/**
	 * Handles the specified (simulated) platform event
	 * - Event names are based on DOM events, but the data object isn't DOM specific.
	 * - This method is overridden by the renderer for the specific UI element type.
	 * @param name The event name, e.g. `click`
	 * @param data Arbitrary event data
	 */
	sendPlatformEvent = (name: TestOutputElement.PlatformEvent, data?: any) => {
		return this;
	};

	/** Returns true if the element is currently included in the render tree, and would be part of the on-screen output */
	isOutput() {
		let current: TestOutputElement | undefined = this;
		while (current) {
			if (current.type === "root") return true;
			current = current.parent;
		}
		return false;
	}

	/** Removes this element from its parent element, if any */
	remove() {
		if (this.parent) {
			let idx = this.parent.content.indexOf(this);
			if (idx >= 0) this.parent.content.splice(idx, 1);
			this.parent = undefined;
		}
	}

	/**
	 * Checks if given styles match with the current style object
	 * - This method is used by {@link expectOutputAsync()}.
	 * @param style A set of style properties on a single object
	 * @returns True, if _all_ of the properties in the provided object match with current style.
	 */
	matchStyleValues(style: Record<string, any>) {
		return _matchAll(this.style, style);
	}

	/**
	 * Checks if given position values match the current position
	 * - This method is used by {@link expectOutputAsync()}.
	 * @param position A set of position properties
	 * @returns True, if _all_ of the properties in the provided object match with current position.
	 */
	matchPositionValues(position: Partial<UIElement.Position>) {
		return _matchAll(this.position, position);
	}

	/**
	 * Checks if given layout values match the current layout
	 * - This method is used by {@link expectOutputAsync()}.
	 * @param layout A set of layout properties
	 * @returns True, if _all_ of the properties in the provided object match with current layout.
	 */
	matchLayoutValues(layout: Partial<UIContainer.Layout>) {
		return _matchAll(this.layout, layout);
	}

	/**
	 * Returns the first (nested) element for which the provided callback returns true
	 * @param f A callback function that's called for each element in the tree, starting with the _content_ of this element, until the function returns a true value.
	 * @returns The first element for which the callback returned a true value, or undefined.
	 */
	querySelectFirst(f: (elt: TestOutputElement) => boolean | undefined) {
		let q = [...this.content];
		while (q.length) {
			let elt = q.shift()!;
			if (f(elt)) return elt;
			q.unshift(...elt.content);
		}
	}

	/**
	 * Returns all (nested) elements for which the provided callback returns true
	 * @param f A callback function that's called for each element in the tree, starting with the _content_ of this element.
	 * @returns A list of all elements for which the callback returned a true value.
	 */
	querySelect(f: (elt: TestOutputElement) => boolean | undefined) {
		let q = [...this.content];
		let results: TestOutputElement[] = [];
		while (q.length) {
			let elt = q.shift()!;
			if (f(elt)) results.push(elt);
			q.unshift(...elt.content);
		}
		return results;
	}

	/** Returns a simplified object representation of this element and its contained elements */
	toJSON(): any {
		let result: any = { type: this.type };
		if (this.text) result.text = this.text;
		if (this.icon) result.icon = this.icon;
		if (this.chevron) result.chevron = this.chevron;
		if (this.imageUrl) result.imageUrl = this.imageUrl;
		if (this.disabled) result.disabled = true;
		if (this.readOnly) result.readOnly = true;
		if (this.pressed) result.pressed = true;
		if (this.checked) result.checked = true;
		if (this.variant) result.variant = { ...this.variant };
		if (this.type === "textfield" || this.type === "textarea")
			result.value = this.value;
		if (this.accessibleRole) result.accessibleRole = this.accessibleRole;
		if (this.accessibleLabel) result.accessibleLabel = this.accessibleLabel;
		if (Object.keys(this.style).length) result.style = this.style;
		if (this.position) result.position = this.position;
		if (this.layout) result.layout = this.layout;
		if (this.content.length) {
			result.content = this.content.map((c) => c?.toJSON());
		}
		return result;
	}
}

export namespace TestOutputElement {
	/** A string representation of common UI element types, used for {@link TestOutputElement.type} */
	export type TypeString =
		| "root"
		| "placeholder"
		| "container"
		| "row"
		| "column"
		| "form"
		| "text"
		| "button"
		| "image"
		| "divider"
		| "spacer"
		| "textfield"
		| "textarea"
		| "toggle";

	/**
	 * Type definition for a set of platform event names
	 * - This type is used by {@link TestOutputElement.sendPlatformEvent()}.
	 * - These names are based on DOM events, but aren't meant to be platform specific.
	 */
	export type PlatformEvent =
		| "click"
		| "dblclick"
		| "mouseup"
		| "mousedown"
		| "keydown"
		| "keyup"
		| "focusin"
		| "focusout"
		| "change"
		| "input"
		| "mouseenter"
		| "mouseleave"
		| "submit";
}
