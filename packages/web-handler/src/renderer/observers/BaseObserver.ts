import {
	ObservedEvent,
	ObservedObject,
	RenderContext,
	UIRenderable,
	app,
} from "@talla-ui/core";
import { WebRenderer } from "../WebRenderer.js";
import { ELT_HND_PROP } from "../events.js";

/** @internal Abstract observer class for all `UIRenderable` instances, to create output and call render callback; implemented for all types of UI elements */
export abstract class BaseObserver<TUIRenderable extends UIRenderable> {
	constructor(public observed: TUIRenderable) {
		this._thisRenderedEvent = new ObservedEvent(
			"Rendered",
			observed,
			undefined,
			undefined,
			undefined,
			true,
		);
		this.observeProperties("hidden", "position", "grow");
		observed.listen((e) => {
			let handler = (this as any)["on" + e.name];
			if (typeof handler === "function") handler.call(this, e);
		});
	}

	/** Set up one or more property listeners, to call {@link propertyChange} on this observer */
	protected observeProperties(...properties: (keyof this["observed"])[]) {
		ObservedObject.observe(this.observed, properties, (_, p, v) =>
			this.propertyChange(p as any, v),
		);
	}

	/** Handler for base property changes; must be overridden to handle other UI element properties */
	protected propertyChange(property: string, value: any) {
		if (!this.element) return;
		if (property === "hidden") {
			this.scheduleHide(value);
		} else {
			// schedule style update only
			this.scheduleUpdate(undefined, this.element);
		}
	}

	/** Rendered element, if any; set by `onRender` handler based on return value of `getOutput()` method */
	element?: HTMLElement;

	/** Rendered output, if any; set by `onRender` handler based on return value of `getOutput()` method */
	output?: RenderContext.Output<HTMLElement>;

	/** Creates output (with element to render) for the observed UI element; called before rendering, must be overridden to create instances of `RenderContext.Output` */
	abstract getOutput(): RenderContext.Output & { element: HTMLElement };

	/** Updates the specified output element with content: either from properties (e.g. text content) or from other UI elements; called automatically by `update()`, but can also be called when state properties change; must be overridden */
	abstract updateContent(element: HTMLElement): void;

	/** Updates the specified output element with all style properties; called automatically by `update()`, but can also be called when state properties change; must be overridden to update output styles */
	abstract updateStyle(element: HTMLElement): void;

	/** Updates the specified output element with all properties of the UI element; called automatically before rendering (after `getOutput`), but can also be called when state properties change */
	update(element: HTMLElement) {
		this._hidden = this.observed.hidden;
		this._asyncContentUp = undefined;
		this._asyncStyleUp = undefined;
		if (this.observed.accessibleRole)
			element.setAttribute("role", String(this.observed.accessibleRole || ""));
		if (this.observed.accessibleLabel)
			element.setAttribute(
				"aria-label",
				String(this.observed.accessibleLabel || ""),
			);
		this.updateContent(element);
		this.updateStyle(element);
	}

	/** Schedules an asynchronous update (content and/or style); gets cancelled if `update` is called synchronously in the meantime */
	scheduleUpdate(updateContent?: HTMLElement, updateStyle?: HTMLElement) {
		if (updateContent) this._asyncContentUp = updateContent;
		if (updateStyle) this._asyncStyleUp = updateStyle;
		if (!this._asyncUp && app.renderer) {
			app.renderer.schedule(() => {
				if (this.observed.isUnlinked()) return;
				try {
					if (this._asyncContentUp) this.updateContent(this._asyncContentUp);
					if (this._asyncStyleUp) this.updateStyle(this._asyncStyleUp);
				} finally {
					this._asyncUp = false;
					this._asyncContentUp = undefined;
					this._asyncStyleUp = undefined;
				}
			});
			this._asyncUp = true;
		}
	}

	private _asyncUp?: boolean;
	private _asyncContentUp?: HTMLElement;
	private _asyncStyleUp?: HTMLElement;

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

	/** Render event handler, calls encapsulated render callback with existing or new output */
	onRender(
		event: ObservedEvent<
			UIRenderable,
			{ render: RenderContext.RenderCallback }
		>,
	) {
		if (
			typeof event.data.render === "function" &&
			event.source === this.observed
		) {
			if (!this.element) {
				// create output element if needed
				let output = (this.output = this.getOutput());
				this.element = output.element;
				if (this.observed.name) {
					this.element.dataset.name = this.observed.name;
				}
				this.observed.lastRenderOutput = output;
				(output.element as any)[ELT_HND_PROP] = this;
			}

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
						let elt = this._getFocusElement();
						if (elt) (app.renderer as WebRenderer).tryFocusElement(elt);
					}

					// emit Rendered event
					this.observed.emit(this._thisRenderedEvent);
				},
			);
		}
	}

	/** Called before handling DOM events, for some elements (see `events.ts`); the view has already been checked here and must be defined */
	onDOMEvent(event: Event, data: any) {
		// nothing here
	}

	/** Focuses current element if possible */
	onRequestFocus(event: ObservedEvent) {
		if (event.source === this.observed) {
			let elt = this._getFocusElement();
			if (elt) (app.renderer as WebRenderer).tryFocusElement(elt);
			else this._requestedFocus = true;
		}
	}

	private _requestedFocus?: boolean;

	/** Focuses next sibling element if possible */
	onRequestFocusNext(event: ObservedEvent) {
		if (event.source === this.observed && this.element) {
			let siblings = this._getFocusableSiblings();
			if (!siblings) return;
			for (let i = 0; i < siblings.length; i++) {
				let sib = siblings[i]!;
				let pos = this.element!.compareDocumentPosition(sib);
				if (
					pos & Node.DOCUMENT_POSITION_FOLLOWING &&
					!(pos & Node.DOCUMENT_POSITION_CONTAINED_BY)
				) {
					(app.renderer as WebRenderer).tryFocusElement(sib);
					return;
				}
			}
		}
	}

	/** Focuses previous sibling element if possible */
	onRequestFocusPrevious(event: ObservedEvent) {
		if (event.source === this.observed && this.element) {
			let siblings = this._getFocusableSiblings();
			if (!siblings) return;
			for (let i = siblings.length - 1; i >= 0; i--) {
				let sib = siblings[i]!;
				let pos = this.element!.compareDocumentPosition(sib);
				if (pos & Node.DOCUMENT_POSITION_PRECEDING) {
					let j = 0;
					while (j < i) {
						pos = siblings[j]!.compareDocumentPosition(sib);
						if (pos & Node.DOCUMENT_POSITION_CONTAINED_BY) break;
						j++;
					}
					(app.renderer as WebRenderer).tryFocusElement(siblings[j]!);
					return;
				}
			}
		}
	}

	/** Helper method that returns a focusable (sub) element, with tabIndex */
	private _getFocusElement() {
		let element = this.element;
		if (!element) return;
		if (element.hasAttribute("tabIndex")) return element;
		return element.querySelectorAll<HTMLElement>("[tabIndex]")[0];
	}

	/** Helper method that returns a list of all focusable siblings (with tabIndex) */
	private _getFocusableSiblings() {
		let element = this.element;
		if (element) {
			let parentElement: HTMLElement | null = element.parentElement;
			while (parentElement) {
				if ((parentElement as any)[ELT_HND_PROP]) break;
				parentElement = parentElement.parentElement;
			}
			if (parentElement) {
				// find focusable elements and focus closest before/after
				return Array.from(
					parentElement.querySelectorAll("[tabIndex]"),
				) as HTMLElement[];
			}
		}
	}

	private _updateCallback?: RenderContext.RenderCallback;
	private _thisRenderedEvent?: ObservedEvent;
}
