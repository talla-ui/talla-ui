import {
	ManagedChangeEvent,
	Observer,
	RenderContext,
	UIComponent,
	UIContainer,
	UITheme,
	app,
} from "desk-frame";
import { TestOutputElement } from "../app/TestOutputElement.js";
import type { TestRenderer } from "./TestRenderer.js";

/** UI component event names that are used for basic platform events */
const _eventNames: { [p in TestOutputElement.PlatformEvent]?: string } = {
	click: "Click",
	dblclick: "DoubleClick",
	mouseup: "MouseUp",
	mousedown: "MouseDown",
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

/** @internal Helper function to find the base style (class) from a style/overrides object (e.g. `UILabel.labelStyle`), if any */
export function getBaseStyleClass(
	object: UITheme.StyleConfiguration<any>,
): undefined | (new () => UITheme.BaseStyle<string, any>) {
	let base = (object as any)?.[UITheme.BaseStyle.OVERRIDES_BASE] || object;
	if (typeof base === "function") return base;
}

/** @internal Helper function to clear the cache of constructed style classes */
export function clearStyles() {
	_baseStyles = new Map();
}

/** @internal Helper function to get styles from a (base) style class */
export function getClassStyles(
	styleClass: new () => UITheme.BaseStyle<string, any>,
) {
	if (!_baseStyles.has(styleClass)) {
		_baseStyles.set(
			styleClass,
			(new styleClass() as UITheme.BaseStyle<string, any>).getStyles(),
		);
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

/** @internal Abstract observer class for all `UIComponent` instances, to create output and call render callback; implemented for all types of UI components */
export abstract class TestBaseObserver<
	TUIComponent extends UIComponent,
> extends Observer<TUIComponent> {
	override observe(observed: TUIComponent) {
		return super.observe(observed).observePropertyAsync("hidden", "position");
	}

	/** Handler for base property changes; must be overridden to handle other UI component properties */
	protected override async handlePropertyChange(
		property: string,
		value: any,
		event?: ManagedChangeEvent,
	) {
		if (this.observed && this.element) {
			switch (property) {
				case "hidden":
					this._hidden = this.observed.hidden;
					if (!this._hidden) this.updateStyle(this.element);
					if (this.updateCallback) {
						this.updateCallback = this.updateCallback.call(
							undefined,
							this._hidden ? undefined : this.output,
						);
					}
					return;
				case "position":
					this.scheduleUpdate(undefined, this.element);
					return;
			}
		}
		await super.handlePropertyChange(property, value, event);
	}

	/** Rendered output, if any; set by `onRender` handler based on return value of `getOutput()` method */
	output?: RenderContext.Output<TestOutputElement>;

	/** Rendered element, if any; set by `onRender` handler based on return value of `getOutput()` method */
	element?: TestOutputElement;

	/** Creates test output (with element to render) for the observed UI component; called before rendering, must be overridden to create instances of `TestOutputElement` */
	abstract getOutput(): RenderContext.Output & { element: TestOutputElement };

	/** Updates the specified output element with all properties of the UI component; called automatically before rendering (after `getOutput`), but can also be called when state properties change */
	update(element: TestOutputElement) {
		if (!this.observed) return;
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

	/** Updates the specified output element with content: either from properties (e.g. text content) or from other UI components; called automatically by `update()`, but can also be called when state properties change; must be overridden */
	abstract updateContent(element: TestOutputElement): void;

	/** Updates the specified output element with all style properties; called automatically by `update()`, but can also be called when state properties change; must be overridden to update test output element styles */
	abstract updateStyle(element: TestOutputElement): void;

	private _hidden?: boolean;

	/** Handles platform events, invoked in response to `element.sendPlatformEvent()` */
	handlePlatformEvent(name: TestOutputElement.PlatformEvent, data?: any) {
		let baseEvent = _eventNames[name];
		if (baseEvent && this.observed && !this.observed.isUnlinked()) {
			this.observed.emit(baseEvent, data);
		}
	}

	/** Render event handler, calls encapsulated render callback with existing or new output */
	onRender(event: RenderContext.RendererEvent) {
		if (event.render && event.source === this.observed) {
			if (!this.element) {
				// create output element if needed
				let output = (this.output = this.getOutput());
				this.element = output.element;
				this.observed.lastRenderOutput = output;
			}
			this.element.sendPlatformEvent = (name, data) => {
				this.handlePlatformEvent(name, data);
				return this.element!;
			};

			// update output element with data from source component
			this.update(this.element);

			// call render callback with new element
			this.updateCallback = event.render.call(
				undefined,
				this._hidden ? undefined : this.output,
				() => {
					// try to focus if requested
					if (this._requestedFocus && this.element && !this._hidden) {
						this._requestedFocus = false;
						(app.renderer as TestRenderer).tryFocusElement(this.element);
					}

					// emit Rendered event
					if (this.observed && !this.observed.isUnlinked()) {
						this.observed.emit(
							new RenderContext.RendererEvent("Rendered", this.observed),
						);
					}
				},
			);
		}
	}

	updateCallback?: RenderContext.RenderCallback;

	/** Focus current element if possible */
	onRequestFocus(event: RenderContext.RendererEvent) {
		if (event.source === this.observed) {
			if (this.element)
				(app.renderer as TestRenderer).tryFocusElement(this.element);
			else this._requestedFocus = true;
		}
	}

	private _requestedFocus?: boolean;

	/** Focus next sibling element if possible */
	onRequestFocusNext(event: RenderContext.RendererEvent) {
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
	onRequestFocusPrevious(event: RenderContext.RendererEvent) {
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
}
