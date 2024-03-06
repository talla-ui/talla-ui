import {
	BindingOrValue,
	ManagedEvent,
	ManagedObject,
	Observer,
} from "../base/index.js";
import { ERROR, err, errorHandler } from "../errors.js";
import { RenderContext } from "./RenderContext.js";
import { View, ViewClass } from "./View.js";

/**
 * A class that encapsulates a dynamic view
 *
 * @description
 * View composites contain a single (attached) view object. ViewComposite instances are themselves also views, and as such can be included in a view hierarchy or used as the view object of an {@link Activity}. When rendered, view composites display the contained view component.
 *
 * The encapsulated view is referenced by the {@link ViewComposite.body body} property, which is usually set automatically, either when the ViewComposite is instantiated or right before rendering. It may be changed or unlinked at any time; the rendered view will be updated accordingly by the ViewComposite itself.
 *
 * The {@link ViewComposite.body body} property is watched using {@link ManagedObject.autoAttach}, which means that setting it to a view instance automatically attaches the object to the ViewComposite. Setting the property to undefined will unlink the existing view, and setting it to a new view will unlink an existing one. Therefore, the ViewComposite instance can only contain a single view object at a time.
 *
 * Since the view is attached to the ViewComposite object, bindings continue to work, and events can be handled either by the ViewComposite object or by a containing object.
 *
 * View composites are primarily used in two different ways:
 *
 * - As a way to _control_ an encapsulated view. Refer to e.g. {@link UIConditionalView} and {@link UIListView}, which are built-in ViewComposite classes.
 * - As a way to create reusable view structures. Refer to the static {@link define()} method which can be used to create a ViewComposite class using a function and/or a class.
 *
 * Note the similarities with the {@link Activity} class, which also encapsulates a single view object. As a rule, use _activities_ if event handlers or other class methods include business logic. Use view _composites_ if the class is only concerned with the look and feel of a set of UI components, and all content can be preset, bound, or provided by a view model.
 */
export abstract class ViewComposite<TView extends View = View> extends View {
	/**
	 * Creates a reusable view composite class
	 *
	 * @summary This method can be used to define a reusable view, containing built-in UI components or other views. The resulting class can be used directly in a view.
	 *
	 * Common use cases for view composites include complex field inputs such as date and time pickers, containers such as cards, accordions, tabs, and split views, and application layout templates.
	 *
	 * @param defaults A set of default property values, bindings, and event handlers that will be applied to each instance of the view composite; also determines the preset object type and JSX tag attributes
	 * @param ViewBody A view class, or a function that returns a view class; an instance of this view will be encapsulated by each view composite object — moreover, if a function is provided, it is also used to define rest parameters for the preset method
	 * @returns A new class that extends `ViewComposite`
	 *
	 * @description
	 * This method creates a new class that extends {@link ViewComposite}, which encapsulates and renders a view object. The constructor of the resulting class takes a single object argument, a preset object, which is applied to the instance using {@link View.applyViewPreset()} — setting properties, applying bindings, and adding event handlers. The preset object type follows from the type parameters and/or the provided defaults object.
	 *
	 * The resulting class can be used as a JSX tag on its own, with attributes corresponding to the properties of the (default) preset object. Note that the JSX tag does't create an instance, but a class that _further_ extends the view composite class. Outside of JSX code, the static `preset()` method can be used for the same purpose.
	 *
	 * @note Note that while view _composites_ and view _activities_ are very similar, as a rule, view composites should not include any business logic (in event handlers or other methods). Hence, use this function only to define groups of UI components and determine their look and feel. Where more code is required, consider either view activities, or view models that can be passed around in your code.
	 */
	static withPreset<
		TDefaults extends {},
		TContent extends ViewClass[] = ViewClass[],
		TDeclaredEvents extends string = never,
		TPreset = {
			[k in keyof TDefaults]?: BindingOrValue<TDefaults[k]>;
		} & {
			[e in `on${TDeclaredEvents}`]?: string;
		},
		TView extends View = View,
	>(
		defaults: TDefaults,
		ViewBody?: ViewClass<TView> | ((...content: TContent) => ViewClass<TView>),
	): ViewComposite.WithPreset<TPreset, TContent, TView, TDefaults> {
		return class extends ViewComposite<TView> {
			static preset() {
				return (this as any).bind(undefined, ...arguments);
			}
			constructor(preset: any, ...content: TContent) {
				super();
				this._Content = content;
				this.applyViewPreset({ ...defaults, ...preset });
			}
			protected override createView() {
				return ViewBody
					? ViewBody.prototype instanceof View
						? new (ViewBody as ViewClass)()
						: new ((ViewBody as Function)(...this._Content))()
					: undefined;
			}
			private _Content: TContent;
		} as any;
	}

	/**
	 * Creates a new instance of this view composite
	 * - View composites should not be instantiated directly by an application; instead, they should be used as part of the (static) view hierarchy.
	 */
	constructor() {
		super();

		// auto-attach view, render when changed, delegate events
		class ViewObserver extends Observer<TView> {
			constructor(public vc: ViewComposite) {
				super();
			}
			override observe(observed: TView) {
				super.observe(observed);
				this.vc.render();
				return this;
			}
			override stop() {
				this.vc.render();
			}
			protected override handleEvent(event: ManagedEvent) {
				if (
					this.vc.body &&
					!(event as RenderContext.RendererEvent).isRendererEvent
				) {
					this.vc.delegateViewEvent(event);
				}
			}
		}
		this.autoAttach("body", new ViewObserver(this));
	}

	/**
	 * The encapsulated view object
	 * - Initially, this property is undefined. The view object is only created (using {@link ViewComposite.createView createView()}) when the ViewComposite instance is first rendered. Override {@link ViewComposite.beforeRender beforeRender()} to manipulate the view before rendering, if needed.
	 * - View objects assigned to this property are automatically attached to the ViewComposite object.
	 */
	declare body?: TView;

	/**
	 * Creates the encapsulated view object, to be overridden if needed
	 * - This method is called automatically when rendering a view composite, and the result is assigned to {@link ViewComposite.body}. It should not be necessary to call this method directly.
	 * - The base implementation in the ViewComposite class does nothing. Subclasses should implement their own method, or set the {@link ViewComposite.body body} property in their constructor.
	 */
	protected createView(): TView | undefined | void {
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
	 * - The base implementation calls activity methods starting with `on`, e.g. `onClick` for a `Click` event. The event is passed as a single argument, and the return value should either be `true`, undefined, or a promise (which is awaited just to be able to handle any errors). If the return value is `true` or a promise, the event is considered handled and no further action is taken. Otherwise, the event is emitted again on the ViewComposite instance itself.
	 * - This method may be overridden to handle events in any other way, e.g. to propagate them by emitting the same event on the ViewComposite instance itself.
	 * @param event The event to be delegated (from the view)
	 * @returns This method always returns `true` since the event is either handled or emitted again.
	 */
	protected delegateViewEvent(event: ManagedEvent): boolean | Promise<unknown> {
		// find own handler method
		let method = (this as any)["on" + event.name];
		if (typeof method === "function") {
			let result = method.call(this, event);

			// return true or promise result, otherwise false below
			if (result === true) return true;
			if (result && result.then && result.catch) {
				return (result as Promise<unknown>).catch(errorHandler);
			}
		}
		this.emit(event);
		return true;
	}

	/**
	 * Renders the current view, if any
	 * - This method is called automatically whenever required. It should not be necessary to invoke this method from an application, or to override it.
	 */
	render(callback?: RenderContext.RenderCallback) {
		// create a new view and call beforeRender if needed
		if (!this.body) {
			let body = this.createView();
			if (body) {
				if (!(body instanceof View)) throw err(ERROR.View_Invalid);
				this.body = body;
			}
		}
		if (callback && !this._renderer.isRendered()) this.beforeRender();
		this._renderer.render(this.body, callback);
		return this;
	}

	/** Stateful renderer wrapper, handles content component */
	private _renderer = new RenderContext.DynamicRendererWrapper();
}

export namespace ViewComposite {
	/**
	 * Type definition for an extended view composite class, result of {@link ViewComposite.withPreset()}
	 */
	export type WithPreset<
		TPreset,
		TContent extends any[],
		TBodyView extends View,
		TObject,
	> = {
		/** Creates an instance of this view composite */
		new (
			preset?: TPreset,
			...content: TContent
		): ViewComposite<TBodyView> & TObject;

		/** Creates a preset class that further extends this view composite */
		preset(
			preset?: TPreset,
			...content: TContent
		): { new (): ViewComposite<TBodyView> & TObject };
	};
}
