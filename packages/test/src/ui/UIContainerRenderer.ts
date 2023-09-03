import {
	ManagedChangeEvent,
	RenderContext,
	UIContainer,
	UIStyle,
} from "desk-frame";
import { TestOutputElement } from "../app/TestOutputElement.js";
import { ContentUpdater } from "./ContentUpdater.js";
import { TestRenderObserver } from "./TestRenderObserver.js";

/** @internal */
export class UIContainerRenderer<
	TContainer extends UIContainer,
> extends TestRenderObserver<TContainer> {
	override observe(observed: UIContainer) {
		let result = super
			.observe(observed as any)
			.observePropertyAsync(
				"content",
				"layout",
				"padding",
				"spacing",
				"distribution",
			);
		return result;
	}

	override handleUnlink() {
		if (this.contentUpdater) this.contentUpdater.stop();
		this.contentUpdater = undefined;
		super.handleUnlink();
	}

	protected override async handlePropertyChange(
		property: string,
		value: any,
		event?: ManagedChangeEvent,
	) {
		if (this.observed && this.element) {
			switch (property) {
				case "content":
				case "spacing":
					this.scheduleUpdate(this.element);
					return;
				case "layout":
				case "padding":
				case "align":
					this.scheduleUpdate(undefined, this.element);
					return;
			}
		}
		await super.handlePropertyChange(property, value, event);
	}

	getOutput() {
		if (!this.observed) throw ReferenceError();
		let elt = new TestOutputElement("container");
		let output = new RenderContext.Output(this.observed, elt);
		elt.output = output;
		return output;
	}

	updateContent(element: TestOutputElement) {
		if (!this.observed) return;
		if (!this.contentUpdater) {
			this.contentUpdater = new ContentUpdater(
				this.observed,
				element,
			).setAsyncRendering(this.observed.asyncContentRendering);
		}

		// NOTE: spacing/separators are ignored here because they can't be tested;
		// A real renderer would pass in the separator object here.
		this.contentUpdater.update(this.observed.content);

		element.focusable =
			this.observed.allowFocus || this.observed.allowKeyboardFocus;
	}

	contentUpdater?: ContentUpdater;

	override updateStyle(
		element: TestOutputElement,
		styles?: Partial<UIStyle.Definition>,
	) {
		let container = this.observed;
		if (!container) return;

		let layout: UIStyle.Definition.ContainerLayout = container.layout;
		if (container.distribution)
			layout = { ...layout, distribution: container.distribution };

		let decoration = styles && styles.decoration;
		if (container.padding)
			decoration = { ...decoration, padding: container.padding };

		super.updateStyle(element, {
			...styles,
			containerLayout: layout,
			decoration,
		});
	}
}
