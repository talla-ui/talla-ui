import { RenderContext, UIStyle } from "desk-frame";

/** Running ID for generated elements */
let _uid = 1;

/** Empty object, used to check for empty style properties in output elements */
const _emptyStyleProperty = {};

/** Last focused element, if any */
let lastFocusedElement: TestOutputElement | undefined;

/** A class that represents a rendered output element */
export class TestOutputElement {
	/** Creates a new output element with the provided type */
	constructor(type: TestOutputElement.TypeString) {
		this.type = type;
	}

	/** A unique ID for this element, which can be used to check for unnecessary re-rendering */
	readonly uid = _uid++;

	/** The component type that rendered this output element, one of {@link TestOutputElement.TypeString TypeString} values */
	readonly type: TestOutputElement.TypeString;

	/** The parent element, if any, as rendered by a container UI component */
	parent?: TestOutputElement;

	/** A reference back to the rendered output object */
	output?: RenderContext.Output & { element: TestOutputElement };

	/** True if input has been disabled for a control element (set from {@link UIControl.disabled}) */
	disabled?: boolean;

	/** True if a button or cell element is selected */
	selected?: boolean;

	/** The content of a text field input element */
	value?: string;

	/** The checked state of a toggle element */
	checked?: boolean;

	/** The rendered text content of an element: label text, button label, or placeholder */
	text?: string;

	/** A string representation of the icon as rendered for labels and buttons */
	icon?: string;

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

	/** The element's style name, from {@link UIStyle.name} when rendered */
	styleName = "";

	/** A list of style IDs, from {@link UIStyle.getIds()} when rendered */
	styleIds: ReadonlyArray<string> = [];

	/** All properties from styles that were applied when the UI component was rendered */
	styles: UIStyle.Definition = {
		dimensions: _emptyStyleProperty,
		position: _emptyStyleProperty,
		textStyle: _emptyStyleProperty,
		decoration: _emptyStyleProperty,
		containerLayout: _emptyStyleProperty,
	};

	/** A list of all nested content elements, for containers */
	content: TestOutputElement[] = [];

	/**
	 * Simulates a user click or tap event
	 * - This method sends `mousedown`, `mouseup`, and `click` events immediately after each other.
	 * - This method also takes care of switching `toggle` checked states, and sets focus on a (parent) focusable element.
	 * - Nothing happens if the element is hidden or currently not part of rendered output (see {@link isOutput()}).
	 */
	click() {
		if (!this.isOutput()) return this;

		this.sendPlatformEvent("mousedown");
		if (this.type === "toggle" && !this.disabled) {
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
		return this;
	}

	/**
	 * Simulates text input on a text field element
	 * - This method sets input focus on a text field, sets its value to the provided text, and sends the `input` platform event.
	 * - Nothing happens if the element isn't a text field.
	 * @param text The new text value
	 */
	setValue(text: string) {
		if (this.type !== "textfield") return this;
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
	 * - This method is overridden by the renderer for the specific component type.
	 * @param _name The event name, e.g. `click`
	 * @param _data Arbitrary event data
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
	 * Applies given style set
	 * - This method copies all values from the provided object(s). Each style property overwrites an existing property in `styles`, if any.
	 * - This method is used by the UI component renderer, and typically isn't called as part of a test case.
	 */
	applyStyle(styles: Partial<UIStyle.Definition>) {
		function copyObject(a: any) {
			let result: any = {};
			for (let key in a) {
				if (a[key] != null) {
					result[key] = JSON.parse(JSON.stringify(a[key]));
				}
			}
			return result;
		}
		if (styles.position) this.styles.position = copyObject(styles.position);
		if (styles.dimensions)
			this.styles.dimensions = copyObject(styles.dimensions);
		if (styles.textStyle) this.styles.textStyle = copyObject(styles.textStyle);
		if (styles.decoration)
			this.styles.decoration = copyObject(styles.decoration);
		if (styles.containerLayout)
			this.styles.containerLayout = copyObject(styles.containerLayout);
		return this;
	}

	/**
	 * Checks if given styles match with the current `styles` objects
	 * - This method is used by {@link TestRenderer.expectOutputAsync()}.
	 * @param styles A set of style properties on a single object
	 * @returns True, if _all_ of the properties in the provided object match with current styles.
	 */
	matchStyle(styles: Partial<UIStyle.Definition>) {
		function matchAll(a: any, b: any) {
			if (a == b) return true;
			if (
				a != null &&
				b != null &&
				typeof a === "object" &&
				typeof b === "object"
			) {
				for (let key in b) {
					if (!matchAll(a[key], b[key])) return false;
				}
				return true;
			}
			return false;
		}
		return matchAll(this.styles, styles);
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
		let result: any = {
			type: this.type,
			style: this.styleName,
		};
		if (this.text) result.text = this.text;
		if (this.icon) result.icon = this.icon;
		if (this.imageUrl) result.imageUrl = this.imageUrl;
		if (this.disabled) result.disabled = true;
		if (this.selected) result.selected = true;
		if (this.checked) result.checked = true;
		if (this.type === "textfield") result.value = this.value;
		if (this.accessibleRole) result.accessibleRole = this.accessibleRole;
		if (this.accessibleLabel) result.accessibleLabel = this.accessibleLabel;
		if (this.styles.dimensions !== _emptyStyleProperty) {
			result.dimensions = this.styles.dimensions;
		}
		if (this.styles.position !== _emptyStyleProperty) {
			result.position = this.styles.position;
		}
		if (this.styles.textStyle !== _emptyStyleProperty) {
			result.textStyle = this.styles.textStyle;
		}
		if (this.styles.decoration !== _emptyStyleProperty) {
			result.decoration = this.styles.decoration;
		}
		if (this.styles.containerLayout !== _emptyStyleProperty) {
			result.containerLayout = this.styles.containerLayout;
		}
		if (this.content.length) {
			result.content = this.content.map((elt) => elt.toJSON());
		}
		return result;
	}
}

export namespace TestOutputElement {
	/** A string representation of common UI element types, used for {@link TestOutputElement.type} */
	export type TypeString =
		| "root"
		| "container"
		| "cell"
		| "row"
		| "column"
		| "label"
		| "button"
		| "image"
		| "separator"
		| "spacer"
		| "textfield"
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
		| "keypress"
		| "keyup"
		| "focusin"
		| "focusout"
		| "change"
		| "input"
		| "mouseenter"
		| "mouseleave"
		| "submit";
}
