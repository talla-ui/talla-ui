import {
	app,
	ManagedChangeEvent,
	Observer,
	UIComponent,
	UIStyle,
	RenderContext,
} from "desk-frame";
import { ELT_HND_PROP } from "../events.js";
import { WebRenderer } from "../WebRenderer.js";
import { applyElementCSS } from "../../style/DOMStyle.js";

/** @internal Abstract observer class for all `UIComponent` instances, to create output and call render callback; implemented for all types of UI components */
export abstract class BaseObserver<
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
	output?: RenderContext.Output<HTMLElement>;

	/** Rendered element, if any; set by `onRender` handler based on return value of `getOutput()` method */
	element?: HTMLElement;

	/** Create output (with element to render) for the observed UI component; called before rendering, must be overridden to create instances of `RenderContext.Output` */
	abstract getOutput(): RenderContext.Output & { element: HTMLElement };

	/** Updates the provided output element with all properties of the UI component; called automatically before rendering (after `getOutputElement`), but can also be called when state properties change */
	update(element: HTMLElement) {
		if (!this.observed) return;
		this._asyncContentUp = undefined;
		this._asyncStyleUp = undefined;
		if (this.observed.accessibleRole)
			element.setAttribute("role", this.observed.accessibleRole);
		if (this.observed.accessibleLabel)
			element.setAttribute("aria-label", this.observed.accessibleLabel);
		this.updateContent(element);
		this.updateStyle(element);
	}

	/** Schedules an asynchronous update (content and/or style); gets cancelled if `update` is called synchronously in the meantime */
	scheduleUpdate(updateContent?: HTMLElement, updateStyle?: HTMLElement) {
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
	private _asyncContentUp?: HTMLElement;
	private _asyncStyleUp?: HTMLElement;

	/** Updates the provided output element with content: either from properties (e.g. text content) or from other UI components; called automatically by `update()`, but can also be called when state properties change; must be overridden */
	abstract updateContent(element: HTMLElement): void;

	/** Updates the provided output element with all style properties; called automatically by `update()`, but can also be called when state properties change; must be overridden to update other style properties */
	updateStyle(
		element: HTMLElement,
		styles: Partial<UIStyle.Definition> = {},
		shrinkwrap?: boolean | "auto",
	) {
		let component = this.observed;
		if (!component) return;
		if (component.hidden) {
			this.hidden = true;
		} else {
			this.hidden = false;
			if (!styles.position) styles.position = component.position;
			if (!styles.dimensions) styles.dimensions = component.dimensions;
			if (shrinkwrap && styles.dimensions.grow) {
				styles.dimensions = { ...styles.dimensions, grow: 0 };
			} else if (shrinkwrap === false && !styles.dimensions.grow) {
				styles.dimensions = { ...styles.dimensions, grow: 1 };
			}
			applyElementCSS(element, styles, component);
		}
	}

	/** Render event handler, calls encapsulated render callback with existing or new output */
	onRender(event: RenderContext.RendererEvent) {
		if (event.render && event.source === this.observed) {
			if (!this.element || !this.element.parentNode) {
				// create output element if needed
				let output = (this.output = this.getOutput());
				this.element = output.element;
				this.observed.lastRenderOutput = output;
				(output.element as any)[ELT_HND_PROP] = this;
			}

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
						(app.renderer as WebRenderer).tryFocusElement(this.element);
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

	/** Called before handling DOM events, for some components (see `events.ts`); the component has already been checked here and must be defined */
	onDOMEvent(event: Event) {
		// nothing here
	}

	/** Focuses current element if possible */
	onRequestFocus(event: RenderContext.RendererEvent) {
		if (event.source === this.observed) {
			if (this.element)
				(app.renderer as WebRenderer).tryFocusElement(this.element);
			else this._requestedFocus = true;
		}
	}

	private _requestedFocus?: boolean;

	/** Focuses next sibling element if possible */
	onRequestFocusNext(event: RenderContext.RendererEvent) {
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
	onRequestFocusPrevious(event: RenderContext.RendererEvent) {
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
}
