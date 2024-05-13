import {
	ManagedEvent,
	ManagedObject,
	RenderContext,
	UIComponent,
	UIContainer,
	UIStyle,
	app,
} from "@desk-framework/frame-core";
import { TestOutputElement } from "../app/TestOutputElement.js";
import type { TestRenderer } from "./TestRenderer.js";

/** UI component event names that are used for basic platform events */
const _eventNames: { [p in TestOutputElement.PlatformEvent]?: string } = {
	click: "Click",
	dblclick: "DoubleClick",
	mousedown: "Press",
	mouseup: "Release",
	mouseenter: "MouseEnter",
	mouseleave: "MouseLeave",
	keydown: "KeyDown",
	keyup: "KeyUp",
	keypress: "KeyPress",
	focusin: "FocusIn",
	focusout: "FocusOut",
	change: "Change",
	input: "Input",
	submit: "Submit",
};

/** A cache of constructed style classes, indexed by class reference */
let _baseStyles = new Map<any, Readonly<any[]>>();

/** @internal Helper function to find the base style (class) from a style/overrides object (e.g. `UILabel.style`), if any */
export function getBaseStyleClass(object: any): undefined | UIStyle.Type<any> {
	let base = (object as any)?.[UIStyle.OVERRIDES_BASE] || object;
	if (typeof base === "function") return base;
}

/** @internal Helper function to clear the cache of constructed style classes */
export function clearStyles() {
	_baseStyles = new Map();
}

/** @internal Helper function to get styles from a (base) style class */
export function getClassStyles(styleClass: UIStyle.Type<any>) {
	if (!_baseStyles.has(styleClass)) {
		_baseStyles.set(styleClass, (new styleClass() as UIStyle<any>).getStyles());
	}
	return _baseStyles.get(styleClass)!;
}

/** @internal Helper function to merge all style overrides on a single test output element */
export function applyElementStyle(
	element: TestOutputElement,
	styleOverrides?: any[],
	position?: UIComponent.Position,
	layout?: UIContainer.Layout,
) {
	let styles: any = (element.styles = {
		...(element.styleClass ? getClassStyles(element.styleClass) : undefined),
		...position,
		...layout,
	});
	function addOverrides(objects: any[]) {
		for (let style of objects) {
			if (!style) continue;
			if (Array.isArray(style)) {
				// item is an array, recurse
				addOverrides(style);
			} else if (Array.isArray(style.overrides)) {
				// item is an object with more overrides, recurse
				addOverrides(style.overrides);
			} else if (typeof style !== "function") {
				// set styles from plain object
				for (let p in style) {
					if (style[p] !== undefined) {
						styles[p] = style[p];
					}
				}
			}
		}
	}
	if (styleOverrides) addOverrides(styleOverrides);
}

/** @internal Abstract observer class for all `UIComponent` instances, to create output and call render callback; implemented for all types of UI components, created upon rendering, and attached to enable property bindings */
export abstract class TestBaseObserver<TUIComponent extends UIComponent> {
	constructor(public observed: TUIComponent) {
		this._thisRenderedEvent = new ManagedEvent(
			"Rendered",
			observed,
			undefined,
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

	/** Set up one or more property listeners, to call {@link propertyChange} on this observer */
	protected observeProperties(...properties: (keyof this["observed"])[]) {
		ManagedObject.observe(this.observed, properties, (_, p, v) =>
			this.propertyChange(p as any, v),
		);
	}

	/** Handler for base property changes; must be overridden to handle other UI component properties */
	protected propertyChange(property: string, value: any) {
		if (!this.element) return;
		switch (property) {
			case "hidden":
				this.scheduleHide(value);
				return;
			case "position":
				this.scheduleUpdate(undefined, this.element);
				return;
		}
	}

	/** Rendered element, if any; set by `onRender` handler based on return value of `getOutput()` method */
	element?: TestOutputElement;

	/** Rendered output, if any; set by `onRender` handler based on return value of `getOutput()` method */
	output?: RenderContext.Output<TestOutputElement>;

	/** Creates test output (with element to render) for the observed UI component; called before rendering, must be overridden to create instances of `TestOutputElement` */
	abstract getOutput(): RenderContext.Output & { element: TestOutputElement };

	/** Updates the specified output element with content: either from properties (e.g. text content) or from other UI components; called automatically by `update()`, but can also be called when state properties change; must be overridden */
	abstract updateContent(element: TestOutputElement): void;

	/** Updates the specified output element with all style properties; called automatically by `update()`, but can also be called when state properties change; must be overridden to update test output element styles */
	abstract updateStyle(element: TestOutputElement): void;

	/** Updates the specified output element with all properties of the UI component; called automatically before rendering (after `getOutput`), but can also be called when state properties change */
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
			let event = new ManagedEvent(
				baseEvent,
				this.observed,
				data,
				undefined,
				undefined,
				baseEvent === "MouseEnter" || baseEvent === "MouseLeave",
			);
			this.observed.emit(event);
		}
	}

	/** Render event handler, calls encapsulated render callback with existing or new output */
	onRender(
		event: ManagedEvent<UIComponent, { render: RenderContext.RenderCallback }>,
	) {
		if (
			typeof event.data.render === "function" &&
			event.source === this.observed
		) {
			if (!this.element) {
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

			// update output element with data from source component
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
	onRequestFocus(event: ManagedEvent) {
		if (event.source === this.observed) {
			if (this.element)
				(app.renderer as TestRenderer).tryFocusElement(this.element);
			else this._requestedFocus = true;
		}
	}

	private _requestedFocus?: boolean;

	/** Focus next sibling element if possible */
	onRequestFocusNext(event: ManagedEvent) {
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
	onRequestFocusPrevious(event: ManagedEvent) {
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
	private _thisRenderedEvent?: ManagedEvent;
}
