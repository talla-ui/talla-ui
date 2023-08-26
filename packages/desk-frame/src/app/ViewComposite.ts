import { ManagedEvent, ManagedObject, Observer } from "../core/index.js";
import { errorHandler } from "../errors.js";
import { RenderContext } from "./RenderContext.js";
import { View, ViewClass } from "./View.js";

/**
 * A class that encapsulates a dynamic view
 *
 * @description
 * View composites contain a single (attached) view object. ViewComposite instances are themselves also views, and as such can be included in a view hierarchy or used for a {@link ViewActivity}. When rendered, view composites display the contained view component.
 *
 * The encapsulated view is referenced by the {@link ViewComposite.body body} property, which is usually set automatically, either when the ViewComposite is instantiated or right before rendering. It may be changed or unlinked at any time; the rendered view will be updated accordingly by the ViewComposite itself.
 *
 * The {@link ViewComposite.body body} property is watched using {@link ManagedObject.observeAttach}, which means that setting it to a view instance automatically attaches the object to the ViewComposite. Setting the property to undefined will unlink the existing view, and setting it to a new view will unlink an existing one. Therefore, the ViewComposite instance can only contain a single view object at a time.
 *
 * Since the view is attached to the ViewComposite object, bindings continue to work, and events can be handled either by the ViewComposite object or by a containing object.
 *
 * View composites are primarily used in two different ways:
 *
 * - As a way to _control_ an encapsulated view. Refer to e.g. {@link UIConditional}, {@link UIStyleController}, and {@link UIList}, all of which are built-in ViewComposite classes.
 * - As a way to create reusable view structures. Refer to {@link View.compose()} which can be used to create a ViewComposite class using a function and a set of event handler methods.
 *
 * Note the similarities with the {@link ViewActivity} class, which also encapsulates a single view object. As a rule, use view _activities_ if event handlers or other class methods include business logic. Use view _composites_ if the class is only concerned with the look and feel of a set of UI components, and all content can be preset, bound, or provided by a view model.
 *
 * @note A custom ViewComposite class (such as in the example below) can't be used as a JSX tag using TypeScript. Use the {@link View.compose()} method instead, which produces a builder function that can be used from JSX code while also exposing a typed `.with()` method for non-JSX code.
 *
 * @example
 * // A custom view composite
 * const BodyView = (
 *   <cell>
 *     <label>Count: %[count]</label>
 *     <primarybutton onClick="CountUp">Count</primarybutton>
 *   </cell>
 * );
 *
 * class CounterView extends ViewComposite {
 *   constructor () {
 *     super();
 *     this.body = new BodyView();
 *   }
 *   count = 0;
 *   onCountUp() { this.count++ }
 * }
 */
export abstract class ViewComposite extends View {
	/**
	 * Creates a new instance of this view composite
	 * - View composites should not be instantiated directly by an application; instead, they should be used as part of the (static) view hierarchy.
	 */
	constructor() {
		super();

		// auto-attach view, render when changed, delegate events
		class ViewObserver extends Observer<View> {
			constructor(public controller: ViewComposite) {
				super();
			}
			override observe(observed: View) {
				super.observe(observed);
				this.controller.render();
				return this;
			}
			override stop() {
				this.controller.render();
			}
			protected override handleEvent(event: ManagedEvent) {
				if (
					this.controller.body &&
					!(event as RenderContext.RendererEvent).isRendererEvent
				) {
					this.controller.delegateViewEvent(event);
				}
			}
		}
		this.observeAttach("body", new ViewObserver(this));
	}

	/**
	 * The encapsulated view object
	 * - Initially, this property is undefined. The view object is only created (using {@link ViewComposite.createView createView()}) when the ViewComposite instance is first rendered. Override {@link ViewComposite.beforeRender beforeRender()} to manipulate the view before rendering, if needed.
	 * - View objects assigned to this property are automatically attached to the ViewComposite object.
	 */
	declare body?: View;

	/**
	 * Creates the encapsulated view object, to be overridden if needed
	 * - This method is called automatically when rendering a view composite, and the result is assigned to {@link ViewComposite.body}. It should not be necessary to call this method directly.
	 * - The base implementation in the ViewComposite class does nothing. Subclasses should implement their own method, or set the {@link ViewComposite.body body} property in their constructor.
	 */
	protected createView(): View | undefined | void {
		// nothing here
	}

	/** A method that's called before the view is rendered, to be overridden if needed */
	protected beforeRender() {
		// nothing here
	}

	/**
	 * Searches the view hierarchy for view objects of the provided type
	 * @summary This method looks for matching view objects in the current view structure — including the view itself. If a component is an instance of the provided class, it's added to the list. Components _within_ matching components aren't searched for further matches.
	 * @param type A view class
	 * @returns An array with instances of the provided view class; may be empty but never undefined.
	 */
	findViewContent<T extends View>(type: ViewClass<T>): T[] {
		return this.body
			? this.body instanceof type
				? [this.body]
				: this.body.findViewContent(type)
			: [];
	}

	/**
	 * Requests input focus on the contained view object
	 * - This method should be overridden if input focus should be requested on another element within the view.
	 */
	requestFocus() {
		if (this.body) this.body.requestFocus();
		return this;
	}

	/**
	 * Delegates events from the current view
	 * - This method is called automatically when an event is emitted by the current view object.
	 * - The base implementation calls activity methods starting with `on`, e.g. `onClick` for a `Click` event. The event is passed as a single argument, and the return value should either be `true`, undefined, or a promise (which is awaited just to be able to handle any errors).
	 * - This method may be overridden to handle events in any other way, e.g. to propagate them by emitting the same event on the ViewComposite instance itself.
	 * @param event The event to be delegated (from the view)
	 * @returns True if an event handler was found, and it returned true; false otherwise.
	 */
	protected delegateViewEvent(event: ManagedEvent) {
		// find own handler method
		let method = (this as any)["on" + event.name];
		if (typeof method === "function") {
			let result = method.call(this, event);

			// return true or promise result, otherwise false below
			if (result === true) return true;
			if (result && result.then && result.catch) {
				return (result as Promise<void>).catch(errorHandler);
			}
		}
		return false;
	}

	/**
	 * Renders the current view, if any
	 * - This method is called automatically whenever required. It should not be necessary to invoke this method from an application, or to override it.
	 */
	render(callback?: RenderContext.RenderCallback) {
		// create a new view and call beforeRender if needed
		if (!this.body) this.body = this.createView()!;
		if (!this._renderer.isRendered()) this.beforeRender();
		this._renderer.render(this.body, callback);
		return this;
	}

	/** Stateful renderer wrapper, handles content component */
	private _renderer = new RenderContext.DynamicRendererWrapper();
}

// Set View.compose function implementation here, now that ViewComposite is available:
View.compose = function (f, extend) {
	// prepare base class, with event delegation method and extended prototype
	class Base extends ViewComposite {
		protected override delegateViewEvent(event: any) {
			return (
				super.delegateViewEvent(event) ||
				!!this.emit(
					new ManagedEvent(event.name, event.source, event.data, this, event)
				)
			);
		}
	}
	if (extend) Object.assign(Base.prototype, extend);

	// prepare builder function and return it
	function compose(preset: any, ...content: any[]) {
		const BodyView = f.apply(undefined, arguments as any) || content[0];
		class ComposedView extends Base {
			constructor() {
				super();
				this.applyViewPreset(preset);
				this.initialize?.();
			}
			declare initialize?: () => void;
			protected override createView() {
				return new BodyView();
			}
		}
		return ComposedView;
	}
	(compose as any).Base = Base;
	(compose as any).with = compose;
	return compose as any;
};
