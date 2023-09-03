import { ManagedEvent, ManagedObject, Observer } from "../core/index.js";
import { errorHandler, invalidArgErr } from "../errors.js";
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
 * - As a way to create reusable view structures. Refer to the static {@link define()} method which can be used to create a ViewComposite class using a function and/or a class.
 *
 * Note the similarities with the {@link ViewActivity} class, which also encapsulates a single view object. As a rule, use view _activities_ if event handlers or other class methods include business logic. Use view _composites_ if the class is only concerned with the look and feel of a set of UI components, and all content can be preset, bound, or provided by a view model.
 *
 * @note A custom ViewComposite class (such as in the example below) can't be used as a JSX tag using TypeScript. Use the {@link ViewComposite.define()} method instead, which produces a builder function that can be used from JSX code while also exposing a typed `.with()` method for non-JSX code.
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
	 * Creates a reusable view composite class factory
	 *
	 * @summary This method can be used to define a reusable view, containing built-in UI components or other views. The result can be used as a tag in JSX code, and also has a `.with()` method for use in non-JSX code.
	 *
	 * Common use cases for view composites include complex field inputs such as date and time pickers, containers such as cards, accordions, tabs, and split views, and application layout templates.
	 *
	 * @param view A view class, or a function that returns a view class; an instance of this view will be encapsulated by each view composite object — moreover, if a function is provided, it is also used to define parameters for the resulting `.with()` method, and properties of the JSX tag
	 * @param ViewCompositeClass A custom {@link ViewComposite} class that will be extended by the resulting view composite class; can be used to define event handlers and other properties or methods
	 * @returns A view component class factory function (see below)
	 * @see {@link ViewComposite}
	 *
	 * @description
	 * This method wraps the provided function (or view) into a class factory function. The resulting function passes all of its arguments to the provided function, and creates a new class each time. The type of the class and the encapsulated view are determined by the provided function arguments and return value (or explicit type arguments).
	 *
	 * **Function arguments** — The provided function (if any) should take a single object argument (the preset object), along with any number of view class arguments (optional).
	 *
	 * - For each instance created, the preset object gets passed to {@link View.applyViewPreset()}, which sets properties, applies bindings, and adds event handlers. Presets _may_ also be used by the provided function itself.
	 * - The view class argument(s) may be used to add inner view content, e.g. by passing them to `UICell.with(...)` inside of the provided function, and returning the result. These view classes are taken from JSX content, or the remaining arguments to the `.with()` method.
	 *
	 * **Function return value** (or provided view) — The provided function should return a view constructor, e.g. the result of `UICell.with(...)`, another view composite, or any other view. This view will be instantiated for each view composite instance. For example, if the function returns a UICell constructor (class), the view composite object will end up rendering a cell.
	 *
	 * **Result object** — While this method returns a function, the declared parameters and return type of this function are mostly used for TypeScript JSX code. The returned function object includes two additional properties:
	 *
	 * - A `.with()` method, which can be used to create a preset class, just like e.g. `UILabel.with({ ... })` or `UICell.with(...)`.
	 * - A `Base` property, which refers to a unique class that's extended each time `.with()` is called. This allows view composites to be identified using `instanceof`, and found using {@link View.findViewContent()}. (Do **not** instantiate this class manually, that won't actually create the expected view composite instance).
	 *
	 * @note Note that while view _composites_ and view _activities_ are very similar, as a rule, view composites should not include any business logic (in event handlers or other methods). Hence, use the {@link ViewComposite.define()} method only to define groups of UI components and determine their look and feel. In cases where more code is required, consider either view activities, or view models that can be passed around in your code.
	 *
	 * @example
	 * // A view composite that uses preset properties and content
	 * const Card = ViewComposite.define(
	 *   (
	 *     p: { title?: StringConvertible | Binding<StringConvertible> },
	 *     ...content: ViewClass[]
	 *   ) => (
	 *     <cell style={myStyles.cardCell}>
	 *       <row>
	 *         <h3>{p.title}</h3>
	 *       </row>
	 *       {content}
	 *     </cell>
	 *   )
	 * );
	 *
	 * // Use like this in JSX:
	 * <Card title="Foo"> ... </Card>
	 *
	 * // Or like this outside of JSX:
	 * Card.with(
	 *   { title: "Foo" },
	 *   // ... content
	 * )
	 *
	 * @example
	 * // A view composite that only uses preset properties
	 * const BadgeButton = ViewComposite.define<{
	 *   label?: StringConvertible | Binding<StringConvertible>
	 *   badge?: StringConvertible | Binding<StringConvertible>
	 * }>(
	 *   UICell.with(
	 *     { dimensions: { grow: 0 }, layout: { clip: false } },
	 *     UIOutlineButton.withLabel(bound.string("label")),
	 *     UILabel.withText(bound("badge"), myStyles.badge)
	 *   )
	 * );
	 *
	 * @example
	 * const CollapsingBlock = ViewComposite.define<{
	 *   title?: StringConvertible | Binding<StringConvertible>;
	 *   show?: boolean;
	 * }>(
	 *   (p, ...content) => (
	 *     <column>
	 *       <row onClick="RowClicked">
	 *         <h3>{p.title}</h3>
	 *       </row>
	 *       <column hidden={bound.not("show")}>
	 *         {content}
	 *       </column>
	 *     </column>
	 *   ),
	 *   class extends ViewComposite {
	 *     show = true;
	 *     onRowClicked() {
	 *       this.show = !this.show;
	 *     }
	 *   }
	 * );
	 *
	 * @example
	 * // A view composite that adds an event handler
	 * const SelectOnClick = ViewComposite.define(
	 *   (p, content) => content,
	 *   class extends ViewComposite {
	 *     onClick() {
	 *       this.body?.emit("Select");
	 *     }
	 *   }
	 * );
	 *
	 * // Use like this in JSX:
	 * <SelectOnClick>
	 *   <cell> ... </cell>
	 * </SelectOnClick>
	 */
	static define<
		TPreset extends {},
		TContent extends ViewClass[] = [],
		TView extends ViewComposite = ViewComposite & TPreset
	>(
		view: ViewClass | ((preset: TPreset, ...content: TContent) => ViewClass),
		ViewCompositeClass: new () => TView = ViewComposite as any
	): ViewComposite.Builder<[TPreset, ...TContent], TView> {
		if (this !== ViewComposite) throw invalidArgErr("this");

		// prepare base class
		class Base extends (ViewCompositeClass as any as typeof ViewComposite) {
			protected override delegateViewEvent(event: any) {
				return (
					super.delegateViewEvent(event) ||
					!!this.emit(
						new ManagedEvent(event.name, event.source, event.data, this, event)
					)
				);
			}
		}

		// prepare builder function and return it
		function compose(preset: any) {
			const BodyView: ViewClass =
				view.prototype instanceof View
					? view
					: (view as Function).apply(undefined, arguments as any);
			class ComposedView extends Base {
				constructor() {
					super();
					this.applyViewPreset(preset);
				}
				protected override createView() {
					return new BodyView();
				}
			}
			return ComposedView;
		}
		(compose as any).Base = Base;
		(compose as any).with = compose;
		return compose as any;
	}

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

export namespace ViewComposite {
	/**
	 * Type definition for the result of {@link ViewComposite.define()}
	 * - This type accommodates usage within JSX code as well as non-JSX code using `.with()` calls. In practice, {@link ViewComposite.define()} returns a function that has a `with` property that refers to _itself_.
	 * - The `Base` property refers to a base class that's unique to the {@link ViewComposite.define} result, hence all {@link ViewComposite} instances created using this result extend the `Base` class. This can be used with e.g. {@link View.findViewContent()} to find instances within a view hierarchy.
	 */
	export type Builder<TArgs extends any[], TView extends View> = {
		(...args: TArgs): ViewClass<TView>;
		with(...args: TArgs): ViewClass<TView>;
		Base: ViewClass<TView>;
	};
}
