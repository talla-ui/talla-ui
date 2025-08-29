import { ERROR, err } from "../errors.js";
import { ObservableEvent, ObservableObject } from "../object/index.js";
import { RenderContext } from "./RenderContext.js";
import { View } from "./View.js";
import type { ViewBuilder } from "./ViewBuilder.js";

/**
 * A class that encapsulates custom view content
 *
 * @description
 * Custom views are view objects that may include their own state (properties) and event handlers, to render their own content.
 *
 * To be able to use custom views in the view hierarchy, you should also export a builder function that uses {@link CustomViewBuilder} to create a builder object.
 *
 * For views that require a custom renderer (e.g. a platform-dependent graphic), define a view class that extends {@link CustomView}, and overrides the {@link CustomView.render} method altogether. In this case, the view builder should not include any content.
 *
 * @note Custom views are very similar to {@link Activity} objects, but they don't have an active/inactive lifecycle and typically don't include any application logic (especially not for loading or saving data).
 *
 * @example
 * // Define a custom view to store view state
 * export class CollapsibleView extends CustomView {
 *   expanded = false;
 *   onToggle() {
 *     this.expanded = !this.expanded;
 *   }
 * }
 *
 * // Export a builder function that uses the class
 * export function Collapsible(title: StringConvertible, ...content: ViewBuilder[]) {
 *   return {
 *     ...CustomViewBuilder(CollapsibleView, () =>
 *        UI.Column(
 *          UI.Label(title)
 *            .icon(bind("expanded").then("chevronDown", "chevronNext"))
 *            .cursor("pointer")
 *            .intercept("Click", "Toggle"),
 *          UI.ShowWhen(bind("expanded"), UI.Column(...content)),
 *        ),
 *     ),
 *     expand(expanded = true) {
 *       this.initializer.set("expanded", expanded);
 *       return this;
 *     },
 *   };
 * }
 */
export class CustomView extends View {
	static {
		// Enable bindings for all instances, using bind(...) without a type parameter
		CustomView.enableBindings();
	}

	/**
	 * The encapsulated view object, an attached view
	 * - Initially, this property is undefined. The view body is only created (using the result of {@link defineView()}) when the CustomView instance is first rendered.
	 * - Alternatively, you can set it yourself, e.g. in the constructor. In this case, ensure that the object is a {@link View} instance that's attached directly to this view (for event handling and bindings), delegating events using {@link delegate()}.
	 */
	protected body?: View;

	/**
	 * Returns a view builder for the encapsulated view object, to be overridden if needed
	 *
	 * This method is called automatically when rendering a custom view. A view instance is created, attached, and assigned to {@link CustomView.body}.
	 *
	 * @note This method is overridden automatically by {@link CustomViewBuilder} to return the content builder function.
	 */
	protected defineView(): ViewBuilder | undefined | void {
		// Nothing here...
	}

	/**
	 * Searches the view hierarchy for view objects of the provided type
	 * @summary This method looks for matching view objects in the current view structure — including the view itself. If a view object is an instance of the provided class, it's added to the list. Objects _within_ matching views aren't searched for further matches.
	 * @param type A view class
	 * @returns An array with instances of the provided view class; may be empty but never undefined.
	 */
	findViewContent<T extends View>(type: new (...args: any[]) => T): T[] {
		return this.body
			? this.body instanceof type
				? [this.body]
				: this.body.findViewContent(type)
			: [];
	}

	/**
	 * Requests input focus on the contained view object
	 * - This method should be overridden if input focus should be requested on another element than the view body itself.
	 */
	requestFocus() {
		this.body?.requestFocus();
	}

	/**
	 * Delegates incoming events to methods of this object, notably from the attached view body
	 * - This method is called automatically when an event is emitted by the encapsulated view object.
	 * - The base implementation calls methods starting with `on`, e.g. `onClick` for a `Click` event. The event is passed as a single argument, and the return value should either be `true` (event handled), false/undefined, or a promise (which is awaited just to be able to handle any errors).
	 * @param event The event to be delegated
	 * @returns The result of the event handler method, or undefined.
	 * @see {@link ObservableObject.attach}
	 * @see {@link ObservableObject.EventDelegate}
	 */
	delegate(event: ObservableEvent): Promise<boolean | void> | boolean | void {
		return (this as any)["on" + event.name]?.(event);
	}

	/**
	 * A method that's called before the view is rendered, to be overridden if needed
	 * - The default implementation emits a `BeforeRender` event. The event is never propagated because of the {@link ObservableEvent.noPropagation} flag.
	 */
	protected beforeRender() {
		this.emit(
			new ObservableEvent(
				"BeforeRender",
				this,
				undefined,
				undefined,
				undefined,
				true,
			),
		);
	}

	/**
	 * Creates and renders the encapsulated view body, if any
	 * - This method is called automatically whenever required. It's not necessary to invoke this method from an application.
	 * - This method may be overridden to render custom platform-dependent content.
	 */
	render(callback: RenderContext.RenderCallback) {
		if (!this.body) {
			let body = this.defineView()?.create();
			if (body) {
				if (!(body instanceof View)) throw err(ERROR.View_Invalid);
				this.body = this.attach(body, {
					delegate: this,
					detached: (body) => {
						if (this.body === body) this.body = undefined;
					},
				});
			}
		}
		if (this.body && ObservableObject.whence(this.body) !== this) {
			throw err(ERROR.View_NotAttached);
		}
		if (!this._rendered) {
			this._rendered = true;
			this.beforeRender();
		}
		this.body?.render(callback);
	}

	private _rendered = false;
}
