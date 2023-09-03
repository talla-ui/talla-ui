import {
	app,
	ManagedChangeEvent,
	Observer,
	UIComponent,
	UIStyle,
	RenderContext,
} from "desk-frame";
import { TestOutputElement } from "../app/TestOutputElement.js";
import type { TestRenderer } from "../app/TestRenderer.js";

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

/** @internal Abstract observer class for all `UIComponent` instances, to create output and call render callback; implemented for all types of UI components */
export abstract class TestRenderObserver<
	TUIComponent extends UIComponent,
> extends Observer<TUIComponent> {
	override observe(observed: TUIComponent) {
		return super
			.observe(observed)
			.observePropertyAsync("hidden", "dimensions", "position");
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
					this.updateStyle(this.element);
					if (this.updateCallback) {
						this.updateCallback = this.updateCallback.call(
							undefined,
							this.hidden ? undefined : this.output,
						);
					}
					return;
				case "dimensions":
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

	/** Create test output (with element to render) for the observed UI component; called before rendering, must be overridden to create instances of `TestOutputElement` */
	abstract getOutput(): RenderContext.Output & { element: TestOutputElement };

	/** Update the specified output element with all properties of the UI component; called automatically before rendering (after `getOutputElement`), but can also be called when state properties change */
	update(element: TestOutputElement) {
		if (!this.observed) return;
		element.accessibleRole = this.observed.accessibleRole;
		element.accessibleLabel = this.observed.accessibleLabel;
		this.updateContent(element);
		this.updateStyle(element);
	}

	/** Schedule asynchronous update (content and/or style); gets cancelled if `update` is called synchronously in the meantime */
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

	/** Update the specified output element with content: either from properties (e.g. text content) or from other UI components; called automatically by `update()`, but can also be called when state properties change; must be overridden */
	abstract updateContent(element: TestOutputElement): void;

	/** Update the specified output element with all style properties; called automatically by `update()`, but can also be called when state properties change; must be overridden to update other style properties */
	updateStyle(
		element: TestOutputElement,
		styles: Partial<UIStyle.Definition> = {},
		shrinkwrap?: boolean | "auto",
	) {
		let component = this.observed;
		if (!component) return;
		if (component.hidden) {
			this.hidden = true;
		} else {
			this.hidden = false;
			element.styleName = component.style.name;
			element.styleIds = component.style.getIds();
			if (!styles.position) styles.position = component.position;
			if (!styles.dimensions) styles.dimensions = component.dimensions;
			if (shrinkwrap && styles.dimensions.grow) {
				styles.dimensions = { ...styles.dimensions, grow: 0 };
			} else if (shrinkwrap === false && !styles.dimensions.grow) {
				styles.dimensions = { ...styles.dimensions, grow: 1 };
			}
			element.applyStyle(styles);
		}
	}

	/** Handle platform events, invoked in response to `element.sendPlatformEvent()` */
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
				this.hidden ? undefined : this.output,
				() => {
					// try to focus if requested
					if (this._requestedFocus && this.element && !this.hidden) {
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

	hidden?: boolean;
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
