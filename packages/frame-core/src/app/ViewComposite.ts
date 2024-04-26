import { BindingOrValue, ManagedEvent, ManagedObject } from "../base/index.js";
import { ERROR, err, errorHandler, invalidArgErr } from "../errors.js";
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
 * The {@link ViewComposite.body body} property is managed using a setter and getter. Setting it to a view instance automatically attaches the view to the ViewComposite. Setting the property to undefined will unlink the existing view, and setting it to a new view will unlink an existing one. Therefore, the ViewComposite instance can only contain a single view object at a time.
 *
 * Since the view is attached to the ViewComposite object, bindings continue to work, and events can be handled either by the ViewComposite object or by a containing object.
 *
 * View composites are primarily used in two different ways:
 *
 * - As a way to _control_ an encapsulated view. Refer to e.g. {@link UIConditionalView} and {@link UIListView}, which are built-in ViewComposite classes.
 * - As a way to create reusable view structures. Refer to the static {@link withPreset()} method which can be used to create a ViewComposite class using a function and/or a class.
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
				if (preset?.variant && !(this instanceof preset.variant.type)) {
					throw invalidArgErr("preset.variant");
				}
				let apply = { ...defaults, ...preset?.variant?.preset, ...preset };
				delete apply.variant;
				this.applyViewPreset(apply);
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
	}

	/**
	 * The encapsulated view object, an attached view
	 * - Initially, this property is undefined. The view object is only created (using {@link ViewComposite.createView createView()}) when the ViewComposite instance is first rendered.
	 * - Alternatively, you can set it yourself, e.g. in the constructor. In this case, ensure that the object is a {@link View} instance that's attached directly to this view composite, and events are delegated using {@link ViewComposite.delegateViewEvent}.
	 */
	body?: TView;

	/**
	 * Creates the encapsulated view object, to be overridden if needed
	 * - The base implementation of this method in the ViewComposite class does nothing. Subclasses should implement their own method, or set the {@link ViewComposite.body body} property in their constructor.
	 * - This method is called automatically when rendering a view composite. The result is attached to the view composite object, and assigned to {@link ViewComposite.body}. If the view is unlinked, the {@link ViewComposite.body} property is set to undefined again.
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
	 * - This method should be overridden if input focus should be requested on another element than the view body itself.
	 */
	requestFocus() {
		if (this.body) this.body.requestFocus();
		return this;
	}

	/**
	 * Delegates events from the current view
	 * - This method is called automatically when an event is emitted by the current view object (except if {@link ManagedEvent.noPropagation} was set).
	 * - The base implementation calls activity methods starting with `on`, e.g. `onClick` for a `Click` event. The event is passed as a single argument, and the return value should either be `true` (event handled), false/undefined, or a promise (which is awaited just to be able to handle any errors).
	 * - If a handler is not found, or it returned false or undefined, a delegate event is re-emitted on the view composite itself (i.e. a new event with `delegate` set to the view composite), and this method returns false.
	 * @param event The event to be delegated (from the view)
	 * @returns True if an event handler was found, and it returned true; a promise if the handler returned a promise; false otherwise.
	 */
	protected delegateViewEvent(event: ManagedEvent): boolean | Promise<unknown> {
		if (this.isUnlinked() || event.noPropagation) return false;

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
		event = ManagedEvent.withDelegate(event, this);
		this.emit(event);
		return false;
	}

	/**
	 * Renders the current view, if any
	 * - This method is called automatically whenever required. It's not necessary to invoke this method from an application, or to override it.
	 */
	render(callback?: RenderContext.RenderCallback) {
		if (!this.body) {
			let body = this.createView();
			if (body) {
				if (!(body instanceof View)) throw err(ERROR.View_Invalid);
				this.body = this.attach(body, {
					handler: (_, event) => {
						this.delegateViewEvent(event);
					},
					detached: (body) => {
						if (this.body === body) this.body = undefined;
					},
				});
			}
		}
		if (this.body && ManagedObject.whence(this.body) !== this) {
			throw err(ERROR.View_NotAttached);
		}
		if (callback && !this._renderer.isRendered()) this.beforeRender();
		this._renderer.render(this.body, callback);
		return this;
	}

	/** Stateful renderer wrapper, handles content component */
	private _renderer = new RenderContext.ViewController();
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
			preset?: TPreset & {
				/** A view composite variant object, applied before other presets */
				variant?: ViewCompositeVariant<TPreset, TObject>;
			},
			...content: TContent
		): ViewComposite<TBodyView> & TObject;

		/** Creates a preset class that further extends this view composite */
		preset(
			preset?: TPreset & {
				/** A view composite variant object, applied before other presets */
				variant?: ViewCompositeVariant<TPreset, TObject>;
			},
			...content: TContent
		): { new (): ViewComposite<TBodyView> & TObject };
	};
}

/**
 * An object that includes predefined properties for a view composite
 * - View composite variants can be used for the `variant` property passed to a view composite constructor, in JSX tags and with the static `preset` method.
 * - Variants can only be used with a specific view composite class, and sub classes.
 * - To create a new variant for a UI component instead, use {@link UIVariant}.
 */
export class ViewCompositeVariant<TPreset, TObject> {
	/**
	 * Creates a new view composite variant object
	 * - The resulting instance can be used for the `variant` property passed to a view composite constructor, in JSX tags and with the static `preset` method.
	 * @param type The view composite class that the variant will be used with
	 * @param preset The properties, bindings, and event handlers that will be preset on each object created with this variant
	 */
	constructor(
		type: ViewComposite.WithPreset<TPreset, any[], View, TObject>,
		preset: Readonly<TPreset>,
	) {
		this.type = type;
		this.preset = Object.freeze({ ...preset });
	}

	/** The view composite class that the variant will be used with */
	public readonly type: ViewComposite.WithPreset<TPreset, any[], View, TObject>;

	/** The properties, bindings, and event handlers that will be preset on each object created with this variant */
	public readonly preset: Readonly<TPreset>;
}
