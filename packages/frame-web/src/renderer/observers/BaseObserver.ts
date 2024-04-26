import {
	ManagedEvent,
	ManagedObject,
	RenderContext,
	UIComponent,
	UIStyle,
	app,
} from "@desk-framework/frame-core";
import { WebRenderer } from "../WebRenderer.js";
import { ELT_HND_PROP } from "../events.js";

/** @internal Helper function to find the base style (class) from a style/overrides object (e.g. `UILabel.labelStyle`), if any */
export function getBaseStyleClass(object: any): undefined | UIStyle.Type<any> {
	let base = (object as any)?.[UIStyle.OVERRIDES_BASE] || object;
	if (typeof base === "function") return base;
}

/** @internal Abstract observer class for all `UIComponent` instances, to create output and call render callback; implemented for all types of UI components */
export abstract class BaseObserver<TUIComponent extends UIComponent> {
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
	element?: HTMLElement;

	/** Rendered output, if any; set by `onRender` handler based on return value of `getOutput()` method */
	output?: RenderContext.Output<HTMLElement>;

	/** Creates output (with element to render) for the observed UI component; called before rendering, must be overridden to create instances of `RenderContext.Output` */
	abstract getOutput(): RenderContext.Output & { element: HTMLElement };

	/** Updates the specified output element with content: either from properties (e.g. text content) or from other UI components; called automatically by `update()`, but can also be called when state properties change; must be overridden */
	abstract updateContent(element: HTMLElement): void;

	/** Updates the specified output element with all style properties; called automatically by `update()`, but can also be called when state properties change; must be overridden to update output styles */
	abstract updateStyle(element: HTMLElement): void;

	/** Updates the specified output element with all properties of the UI component; called automatically before rendering (after `getOutput`), but can also be called when state properties change */
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
		event: ManagedEvent<UIComponent, { render: RenderContext.RenderCallback }>,
	) {
		if (
			typeof event.data.render === "function" &&
			event.source === this.observed
		) {
			if (!this.element) {
				// create output element if needed
				let output = (this.output = this.getOutput());
				this.element = output.element;
				this.observed.lastRenderOutput = output;
				(output.element as any)[ELT_HND_PROP] = this;
			}

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
						(app.renderer as WebRenderer).tryFocusElement(this.element);
					}

					// emit Rendered event
					this.observed.emit(this._thisRenderedEvent);
				},
			);
		}
	}

	/** Called before handling DOM events, for some components (see `events.ts`); the component has already been checked here and must be defined */
	onDOMEvent(event: Event) {
		// nothing here
	}

	/** Focuses current element if possible */
	onRequestFocus(event: ManagedEvent) {
		if (event.source === this.observed) {
			if (this.element)
				(app.renderer as WebRenderer).tryFocusElement(this.element);
			else this._requestedFocus = true;
		}
	}

	private _requestedFocus?: boolean;

	/** Focuses next sibling element if possible */
	onRequestFocusNext(event: ManagedEvent) {
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
	onRequestFocusPrevious(event: ManagedEvent) {
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
	private _thisRenderedEvent?: ManagedEvent;
}
