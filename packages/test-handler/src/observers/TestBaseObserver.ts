import {
	ObservableEvent,
	RenderContext,
	UIElement,
	UIStyle,
	app,
} from "@talla-ui/core";
import { TestOutputElement } from "../TestOutputElement.js";
import { TestRenderer } from "../TestRenderer.js";

/** UI element event names that are used for basic platform events */
const _eventNames: { [p in TestOutputElement.PlatformEvent]?: string } = {
	click: "Click",
	dblclick: "DoubleClick",
	mousedown: "Press",
	mouseup: "Release",
	mouseenter: "MouseEnter",
	mouseleave: "MouseLeave",
	keydown: "KeyDown",
	keyup: "KeyUp",
	focusin: "FocusIn",
	focusout: "FocusOut",
	change: "Change",
	input: "Input",
	submit: "Submit",
};

/** @internal Helper function to merge all style overrides, position, and layout on a single test output element */
export function applyElementStyle(element: TestOutputElement, styles: any[]) {
	let result: any;
	function recurse(values: readonly any[]) {
		for (let i = 0, len = values.length; i < len; i++) {
			let style = values[i];
			if (!style) continue;

			// check if next item is a(nother) full UIStyle, if so ignore this one
			if (values[i + 1] instanceof UIStyle) continue;

			// recurse for (nested) arrays
			if (Array.isArray(style)) {
				return recurse(style);
			}

			// apply styles and overrides to result
			if (style instanceof UIStyle) {
				result = {};
				recurse(style.getStyles());
				let overrides = style.getOverrides() as any;
				for (let p in overrides) {
					if (overrides[p] !== undefined) result[p] = overrides[p];
				}
			} else {
				let state = (style as UIStyle.StyleDefinition).state || {};

				// ignore hover state in test handler, check other states
				if (
					state.hovered ||
					("disabled" in state && state.disabled !== !!element.disabled) ||
					("focused" in state && state.focused !== element.hasFocus()) ||
					("pressed" in state && state.pressed !== !!element.pressed) ||
					("readonly" in state && state.readonly !== !!element.readOnly)
				)
					continue;

				// apply all styles to result
				result ||= {};
				for (let p in style) {
					if (style[p] !== undefined) result[p] = style[p];
				}
			}
		}
	}
	recurse(styles);
	element.styles = result || {};
}

/** @internal Abstract observer class for all `UIElement` instances, to create output and call render callback; implemented for all types of UI elements, created upon rendering, and attached to enable property bindings */
export abstract class TestBaseObserver<TUIViewElement extends UIElement> {
	constructor(public observed: TUIViewElement) {
		this._thisRenderedEvent = new ObservableEvent(
			"Rendered",
			observed,
			undefined,
			undefined,
			true,
		);
		this.observeProperties("hidden", "position");
		observed.listen((e) => {
			let handler = (this as any)["on" + e.name];
			if (typeof handler === "function") handler.call(this, e);
		});
	}

	private _remounted = TestRenderer.lastRemountIdx;

	/** Set up one or more property listeners, to call {@link propertyChange} on this observer */
	protected observeProperties(
		...properties: (string & keyof this["observed"])[]
	) {
		for (let p of properties) {
			this.observed.observe(p, (v) => this.propertyChange(p, v));
		}
	}

	/** Handler for base property changes; must be overridden to handle other UI element properties */
	protected propertyChange(property: string, value: any) {
		if (!this.element) return;
		if (property === "hidden") {
			this.scheduleHide(value);
		} else {
			this.scheduleUpdate(undefined, this.element);
		}
	}

	/** Rendered element, if any; set by `onRender` handler based on return value of `getOutput()` method */
	element?: TestOutputElement;

	/** Rendered output, if any; set by `onRender` handler based on return value of `getOutput()` method */
	output?: RenderContext.Output<TestOutputElement>;

	/** Creates test output (with element to render) for the observed UI element; called before rendering, must be overridden to create instances of `TestOutputElement` */
	abstract getOutput(): RenderContext.Output & { element: TestOutputElement };

	/** Updates the specified output element with content: either from properties (e.g. text content) or from other UI elements; called automatically by `update()`, but can also be called when state properties change; must be overridden */
	abstract updateContent(element: TestOutputElement): void;

	/** Updates the specified output element with all style properties; called automatically by `update()`, but can also be called when state properties change; must be overridden to update test output element styles */
	abstract updateStyle(element: TestOutputElement): void;

	/** Updates the specified output element with all properties of the UI element; called automatically before rendering (after `getOutput`), but can also be called when state properties change */
	update(element: TestOutputElement) {
		this._hidden = this.observed.hidden;
		this._asyncContentUp = undefined;
		this._asyncStyleUp = undefined;
		if (this.observed.accessibleRole)
			element.accessibleRole = String(this.observed.accessibleRole || "");
		if (this.observed.accessibleLabel)
			element.accessibleLabel = String(this.observed.accessibleLabel || "");
		this.updateContent(element);
		this.updateStyle(element);
	}

	/** Schedules an asynchronous update (content and/or style); gets cancelled if `update` is called synchronously in the meantime */
	scheduleUpdate(
		updateContent?: TestOutputElement,
		updateStyle?: TestOutputElement,
	) {
		if (updateContent) this._asyncContentUp = updateContent;
		if (updateStyle) this._asyncStyleUp = updateStyle;
		if (!this._asyncUp && app.renderer) {
			app.renderer.schedule(() => {
				if (this.observed.isUnlinked()) return;
				this._asyncUp = false;
				if (this._asyncContentUp) this.updateContent(this._asyncContentUp);
				this._asyncContentUp = undefined;
				if (this._asyncStyleUp) this.updateStyle(this._asyncStyleUp);
				this._asyncStyleUp = undefined;
			});
			this._asyncUp = true;
		}
	}

	private _asyncUp?: boolean;
	private _asyncContentUp?: TestOutputElement;
	private _asyncStyleUp?: TestOutputElement;

	/** Schedules an asynchronous update to show or hide the output */
	scheduleHide(hidden?: boolean) {
		app.renderer?.schedule(() => {
			let elt = this.element;
			if (!elt) return;
			this._hidden = hidden;
			if (!hidden) this.updateStyle(elt);
			if (this._updateCallback) {
				this._updateCallback = this._updateCallback.call(
					undefined,
					hidden ? undefined : this.output,
				);
			}
		});
	}

	private _hidden?: boolean;

	/** Handles platform events, invoked in response to `element.sendPlatformEvent()` */
	handlePlatformEvent(name: TestOutputElement.PlatformEvent, data?: any) {
		let baseEvent = _eventNames[name];
		if (baseEvent && !this.observed.isUnlinked()) {
			let event = new ObservableEvent(
				baseEvent,
				this.observed,
				data,
				undefined,
				baseEvent === "MouseEnter" || baseEvent === "MouseLeave",
			);
			this.observed.emit(event);
		}
	}

	/** Render event handler, calls encapsulated render callback with existing or new output */
	onRender(
		event: ObservableEvent<UIElement, { render: RenderContext.RenderCallback }>,
	) {
		if (
			typeof event.data.render === "function" &&
			event.source === this.observed
		) {
			if (!this.element || this._remounted !== TestRenderer.lastRemountIdx) {
				// create output element if needed
				let output = (this.output = this.getOutput());
				output.element.name = this.observed.name;
				this.element = output.element;
				this.observed.lastRenderOutput = output;
			}
			this.element.sendPlatformEvent = (name, data) => {
				this.handlePlatformEvent(name, { ...data });
				return this.element!;
			};

			// update output element with data from source
			this.update(this.element);

			// call render callback with new element
			this._updateCallback = event.data.render.call(
				undefined,
				this._hidden ? undefined : this.output,
				() => {
					if (this.observed.isUnlinked()) return;

					// try to focus if requested
					if (this._requestedFocus && this.element && !this._hidden) {
						this._requestedFocus = false;
						(app.renderer as TestRenderer).tryFocusElement(this.element);
					}

					// emit Rendered event
					this.observed.emit(this._thisRenderedEvent);
				},
			);
		}
	}

	/** Focus current element if possible */
	onRequestFocus(event: ObservableEvent) {
		if (event.source === this.observed) {
			if (this.element)
				(app.renderer as TestRenderer).tryFocusElement(this.element);
			else this._requestedFocus = true;
		}
	}

	private _requestedFocus?: boolean;

	/** Focus next sibling element if possible */
	onRequestFocusNext(event: ObservableEvent) {
		if (event.source === this.observed && this.element) {
			let current = this.element;
			if (current.parent) {
				let focusable = current.parent.querySelect(
					(elt) => elt === current || elt.focusable,
				);
				for (let i = 0; i < focusable.length - 1; i++) {
					if (focusable[i] === current) {
						(app.renderer as TestRenderer).tryFocusElement(focusable[i + 1]);
						return;
					}
				}
			}
		}
	}

	/** Focus previous sibling element if possible */
	onRequestFocusPrevious(event: ObservableEvent) {
		if (event.source === this.observed && this.element) {
			let current = this.element;
			if (current.parent) {
				let focusable = current.parent.querySelect(
					(elt) => elt === current || elt.focusable,
				);
				for (let i = focusable.length - 1; i > 0; i--) {
					if (focusable[i] === current) {
						(app.renderer as TestRenderer).tryFocusElement(focusable[i - 1]);
						return;
					}
				}
			}
		}
	}

	private _updateCallback?: RenderContext.RenderCallback;
	private _thisRenderedEvent?: ObservableEvent;
}
