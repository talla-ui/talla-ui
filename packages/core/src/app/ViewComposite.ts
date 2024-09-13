import {
	Binding,
	BindingOrValue,
	ManagedEvent,
	ManagedObject,
	bind,
} from "../base/index.js";
import { ERROR, err } from "../errors.js";
import { RenderContext } from "./RenderContext.js";
import { View, ViewClass } from "./View.js";

/** Label property used to filter bindings using $view */
const $_bind_label = Symbol("view");

/** An object that can be used to create bindings for properties of the containing {@link ViewComposite} object */
export const $view: Binding.Source = bind.$on($_bind_label);

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
 * - As a way to create reusable view structures. Refer to the static {@link define()} method which can be used to create a ViewComposite class using a function and/or a class.
 *
 * Note the similarities with the {@link Activity} class, which also encapsulates a single view object. As a rule, use _activities_ if event handlers or other class methods include business logic. Use view _composites_ if the class is only concerned with the look and feel of a set of UI components, and all content can be preset, bound, or provided by a view model.
 */
export class ViewComposite extends View {
	/**
	 * Creates a reusable view composite class
	 *
	 * @summary This method can be used to define a reusable view, with specified properties and preset view content. The resulting class can itself be included directly in a view, either using the {@link ui.use()} function or using a JSX tag.
	 *
	 * Common use cases for view composites include complex field inputs such as date and time pickers, containers such as cards, accordions, tabs, and split views, and application layout templates.
	 *
	 * @param defaults A set of default (preset) property values to be applied to each instance of the view composite; these can be overridden by the containing view using preset properties (or JSX attributes)
	 * @param defineView A view class, or a function that returns a view class; an instance of the resulting view will be encapsulated by each view composite object
	 * @returns A new class that extends `ViewComposite`, with a constructor that takes a single preset object argument that mirrors the properties of the `defaults` parameter
	 *
	 * @description
	 * This method creates a new class that extends {@link ViewComposite}, which encapsulates and renders a contained view. The constructor of the resulting class takes a single object argument, a preset object, which is applied to the instance using {@link View.applyViewPreset()} — setting properties, applying bindings, and adding event aliases. The preset object type follows from the provided defaults object.
	 *
	 * The resulting class can be used as a JSX tag on its own, with attributes corresponding to the properties of the (default) preset object. Note that the JSX tag does't create an instance, but a class that _further_ extends the view composite class. Outside of JSX code, the {@link ui.use()} function can be used for the same purpose.
	 *
	 * @note Note that while view _composites_ and view _activities_ are very similar, as a rule, view composites should not include any business logic (in event handlers or other methods). Hence, use this function only to define groups of UI components and determine their look and feel. Where more code is required, consider either view activities, or view models that can be passed around in your code.
	 */
	static define<
		TDefaults extends {},
		TPreset extends {} = {
			[p in keyof TDefaults]?: BindingOrValue<TDefaults[p]>;
		} & {
			[k in `on${Capitalize<string>}`]?: string;
		},
	>(
		defaults: TDefaults,
		defineView?:
			| ViewClass
			| ((values: TDefaults, ...content: ViewClass[]) => ViewClass),
	): {
		new (preset?: TPreset): ViewComposite & TDefaults;
		whence: typeof ManagedObject.whence;
	} {
		return class DefaultsViewComposite extends ViewComposite {
			constructor(p?: TPreset) {
				super();
				this.applyViewPreset(p ? { ...defaults, ...p } : defaults);
			}
			protected override defineView(
				...content: ViewClass[]
			): ViewClass | undefined | void {
				if (defineView) {
					if (defineView.prototype instanceof View)
						return defineView as ViewClass;
					return (defineView as Function)(this as any, ...content);
				}
			}
		} as any;
	}

	/**
	 * The encapsulated view object, an attached view
	 * - Initially, this property is undefined. The view object is only created (using {@link ViewComposite.createView createView()}) when the ViewComposite instance is first rendered.
	 * - Alternatively, you can set it yourself, e.g. in the constructor. In this case, ensure that the object is a {@link View} instance that's attached directly to this view composite, and events are delegated using {@link ViewComposite.delegate}.
	 */
	body?: View;

	/** @internal */
	[$_bind_label] = true;

	/**
	 * Creates a preset view structure for this view composite, to be overridden
	 * - This method is called automatically by {@link createView()} when rendering a view composite. Custom view composite subclasses should either override this method or {@link createView()}, or set the {@link ViewComposite.body} property directly (to an attached view object).
	 * - This method may be called only once for each _preset_ view composite (class), since the result may be reused for multiple instances. Do not use any data in this method that's not preset or static.
	 * @param content Preset content that should be included in the view composite, if any
	 * @returns A view class that can be used to create a view object (i.e. {@link body})
	 */
	protected defineView(...content: ViewClass[]): ViewClass | undefined | void {
		// nothing here.
	}

	/**
	 * Creates the encapsulated view object, using the result from {@link defineView()}
	 * - This method is called automatically when rendering a view composite. The result is attached to the view composite object, and assigned to {@link ViewComposite.body}. If the view is unlinked, the {@link ViewComposite.body} property is set to undefined again.
	 * - The base implementation of this method in the ViewComposite class uses {@link defineView()} to obtain a preset view. Subclasses should either override {@link defineView}, override {@link createView}, or set the {@link ViewComposite.body} property directly (to an attached view object).
	 */
	protected createView(): View | undefined | void {
		let PresetView = this.defineView();
		return (PresetView && new PresetView()) || undefined;
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
	 * Delegates incoming events to methods of this object, notably from the attached view body
	 * - This method is called automatically when an event is emitted by the current view object (except if {@link ManagedEvent.noPropagation} was set on the event; see {@link ManagedObject.attach()} which is used to set up view event delegation).
	 * - The base implementation calls activity methods starting with `on`, e.g. `onClick` for a `Click` event. The event is passed as a single argument, and the return value should either be `true` (event handled), false/undefined, or a promise (which is awaited just to be able to handle any errors).
	 * @param event The event to be delegated
	 * @returns The result of the event handler method, or undefined.
	 * @see {@link ManagedObject.attach}
	 * @see {@link ManagedObject.EventDelegate}
	 */
	delegate(event: ManagedEvent): Promise<boolean | void> | boolean | void {
		return (this as any)["on" + event.name]?.(event);
	}

	/**
	 * Renders the current view, if any
	 * - This method is called automatically whenever required. It's not necessary to invoke this method from an application, or to override it.
	 */
	render(callback: RenderContext.RenderCallback) {
		if (!this.body) {
			let body = this.createView();
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
		if (this.body && ManagedObject.whence(this.body) !== this) {
			throw err(ERROR.View_NotAttached);
		}
		if (!this._rendered) this.beforeRender();
		this.body?.render(callback);
		return this;
	}

	private _rendered = false;
}
