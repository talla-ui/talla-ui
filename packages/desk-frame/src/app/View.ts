import {
	Binding,
	isBinding,
	ManagedEvent,
	ManagedObject,
} from "../core/index.js";
import { invalidArgErr } from "../errors.js";
import { RenderContext } from "./RenderContext.js";
import type { ViewComposite } from "./ViewComposite.js";

/**
 * An abstract class that represents a view
 *
 * @description
 * The view is one of the main architectural components of a Desk application. It provides a method to render its encapsulated content, either directly or using a collection of built-in UI components.
 *
 * Views can be rendered manually (using {@link GlobalContext.render app.render()}), but in most applications views are combined with activities (see {@link ViewActivity}), which render associated views automatically based on their activation state.
 *
 * The View class can't be used on its own. Instead, define views using the following classes and methods:
 * - {@link UIComponent} subclasses and their static `.with()` methods, e.g. `UIButton.with()`, which create **preset** view constructors for built-in UI components.
 * - Specifically, {@link UIContainer} classes such as {@link UICell}, {@link UIRow}, and {@link UIColumn}, which represent containers that contain further UI components (and containers). These can be used to lay out your UI.
 * - Built-in {@link ViewComposite} classes, which control an encapsulated view — such as {@link UIConditional} and {@link UIList}.
 * - The {@link View.compose()} method, which creates a custom `.with()` method that in turn creates a custom {@link ViewComposite} class.
 *
 * Use the View class itself as a _type_, along with {@link ViewClass}, when referencing variables or parameters that should refer to any other view.
 *
 * @see {@link UIComponent}
 * @see {@link ViewComposite}
 */
export abstract class View
	extends ManagedObject
	implements RenderContext.Renderable
{
	/**
	 * A method that should be implemented to render a View object
	 * - The view may be rendered asynchronously, providing output as well as any updates to the provided renderer callback.
	 */
	abstract render(callback: RenderContext.RenderCallback): void;

	/** A method that should be implemented to request input focus on the view output element */
	abstract requestFocus(): void;

	/** A method that should be implemented to find matching components in the view hierarchy */
	abstract findViewContent<T extends View>(type: ViewClass<T>): T[];

	/**
	 * Applies the provided preset properties to this object
	 *
	 * @summary This method is called from the constructor of **preset** view classes, e.g. the result of `UILabel.with({ .. })` and {@link View.compose()}. The provided object may contain property values, bindings, and events.
	 *
	 * **Property values** — These are set directly on the view object. Each property is set to the corresponding value.
	 *
	 * **Bindings** — These are applied on properties the view object. Each property may be bound using an instance of the {@link Binding} class (i.e. the result of {@link bound()} functions), creating the target property and taking effect immediately.
	 *
	 * **Events** — Events can be handled in two ways, depending on the value of the `on...` property:
	 * - `onClick: "RemoveItem"` — this intercepts `Click` events and emits `RemoveItem` events instead. The {@link ManagedEvent.inner} property is set to the original `Click` event.
	 * - `onClick: "+RemoveItem"` — this intercepts `Click` events and emits _both_ the original `Click` event as well as a new `RemoveItem` event. The {@link ManagedEvent.inner} property of the second event refers to the original `Click` event.
	 *
	 * @note This method is called automatically. Do not call this method after constructing a view object.
	 */
	applyViewPreset(preset: {}) {
		let events: { [eventName: string]: string } | undefined;
		for (let p in preset) {
			let v = (preset as any)[p];
			if (v === undefined) continue;

			// intercept and/or forward events: remember all first
			if (p[0] === "o" && p[1] === "n" && (p[2]! < "a" || p[2]! > "z")) {
				// add event handler: forward or substitute event
				let eventName = p.slice(2);
				if (!v || typeof v !== "string" || eventName === v) {
					throw invalidArgErr("preset." + p);
				}
				(events || (events = {}))[eventName] = v;
				continue;
			}

			// apply binding or set property
			isBinding(v) ? v.bindTo(this, p as any) : ((this as any)[p] = v);
		}

		// override emit method if forwarding or intercepting events
		if (events) {
			let _emit = this.emit.bind(this);
			this.emit = function (event, data?) {
				if (typeof event === "string")
					event = new ManagedEvent(event, this, data);

				// check for event intercept/forward
				let v = events![event.name];
				if (!v) return _emit(event);

				// if forward, emit original event first
				if (v[0] === "+") {
					_emit(event);
					v = v.slice(1);
				}

				// emit intercept event with original event as `inner`
				return this.emit(
					new ManagedEvent(v, this, event.data, undefined, event)
				);
			};
		}
	}
}

/** Type definition for a constructor that instantiates a {@link View} object */
export type ViewClass<T extends View = View> = new (...args: any[]) => T;

export namespace View {
	/**
	 * Type definition for the result of {@link View.compose()}
	 * - This type accommodates usage within JSX code as well as non-JSX code using `.with()` calls. In practice, {@link View.compose()} returns a function that has a `with` property that refers to _itself_.
	 * - The `Base` property refers to a base class that's unique to the {@link View.compose} result, hence all {@link ViewComposite} instances created using this result extend the `Base` class. This can be used with e.g. {@link View.findViewContent()} to find instances within a view hierarchy.
	 */
	export type ComposedViewBuilder<TArgs extends any[], TView extends View> = {
		(...args: TArgs): ViewClass<TView>;
		with(...args: TArgs): ViewClass<TView>;
		Base: ViewClass<TView>;
	};

	/** Type definition for the function parameter passed to {@link View.compose()} */
	export type ViewComposeFunction<TPreset, TContent extends any[]> = {
		(preset: TPreset, ...content: TContent): ViewClass | void;
	};

	/** Type definition for the default preset argument type for {@link View.compose()} */
	export type ViewComposePreset<TViewProperties> = {
		[K in keyof TViewProperties]:
			| TViewProperties[K]
			| Binding<Exclude<TViewProperties[K], undefined>>;
	};

	/** Type definition for the prototype extension (event handler methods) object passed to {@link View.compose()} */
	export type ViewComposeExtend<TView extends View> = {
		initialize?: (this: TView) => void;
		beforeRender?: (this: TView) => void;
		beforeUnlink?: (this: TView) => void;
		[p: `on${Uppercase<string>}${string}`]: (
			this: TView,
			event: ManagedEvent
		) => boolean | void | Promise<void>;
	};

	/**
	 * Creates a reusable view composite class factory
	 *
	 * @summary This function can be used to define a reusable view, containing built-in UI components or other views. The result can be used as a tag in JSX code, and also has a `.with()` method for use in non-JSX code.
	 *
	 * Common use cases for view composites include complex field inputs such as date and time pickers, containers such as cards, accordions, tabs, and split views, and application layout templates.
	 *
	 * @param f A function that returns a view class; an instance of this view will be encapsulated by each view composite object — moreover, this function is also used to define parameters for the resulting `.with()` method, and properties of the JSX tag
	 * @param extend An object with additional methods that will be set on the prototype of the view composite class; this can be used to define event handlers
	 * @returns A view component class factory function (see below)
	 * @see {@link ViewComposite}
	 *
	 * @description
	 * The View.compose method wraps the provided function into a class factory function. The resulting function passes all arguments to the provided function, and creates a new class each time. The type of the class and the encapsulated view are determined by the type parameters, function arguments, and return value.
	 *
	 * **Function arguments** — The provided function should take a single object argument (the preset object), along with any number of view class arguments (optional).
	 *
	 * - For each instance created, the preset object gets passed to {@link View.applyViewPreset()}, which sets properties, applies bindings, and adds event handlers. Presets _may_ be used by the provided function itself, but it can also safely ignore them.
	 * - The view class argument(s) may be used to add inner view content, e.g. by passing them to `UICell.with(...)` inside of the provided function, and returning the result. These view classes are taken from JSX content, or the remaining arguments to the `.with()` method.
	 *
	 * **Function return value** — The provided function should return a view constructor, e.g. the result of `UICell.with(...)`, another view composite, or any other view. This view will be instantiated for each view composite instance. For example, if the function returns a UICell constructor (class), the view composite object will end up rendering a cell.
	 *
	 * If the function returns nothing at all, then the first view class argument is used instead. In this case, the view composite can only be used to add event handlers or other methods using the `extend` argument (see below).
	 *
	 * **Type parameters** — Instead of using a typed function 'preset' argument, it's also possible to supply explicit type parameters. The `TViewProperties` parameter defines the type of all properties that should be available on resulting view composite objects; the `TPreset` parameter defines the expected type of the 'preset' argument; finally, `TContent` should be an optional array or tuple defining the expected type of view class arguments.
	 *
	 * **Prototype methods** — The `extend` object passed to View.compose may include any number of methods, which will be added to the view composite class prototype. These may include:
	 *
	 * - `initialize` — a method that's called right after the view composite object has been instantiated.
	 * - `beforeRender` — a method that's called right before the view is rendered, after the encapsulated view object ({@link ViewComposite.body}) has been set.
	 * - `beforeUnlink` — a method that's called right before the view composite object is unlinked.
	 * - `on...` — event handlers, for events that are emitted by the encapsulated view object.
	 *
	 * Note that events are always re-emitted from the view composite object, _unless_ the event handler returns true.
	 *
	 * **Result object** — While this method returns a function, the declared parameters and return type of this function are mostly used for TypeScript JSX code. The returned function object includes two additional properties:
	 *
	 * - A `.with()` method, which can be used to create a preset class, just like e.g. `UILabel.with({ ... })` or `UICell.with(...)`.
	 * - A `Base` property, which refers to a unique class that's extended each time `.with()` is called. This allows view composites to be identified using `instanceof`, and found using {@link View.findViewContent()}. (Do **not** instantiate this class manually, that won't actually create the expected view composite instance).
	 *
	 * @note Note that while view _composites_ and view _activities_ are very similar, as a rule, view composites should not include any business logic (in event handlers or other methods). Hence, use the {@link View.compose()} method only to define groups of UI components and determine their look and feel. In cases where more code is required, consider either view activities, or view models that are attached to view activities and then _bound_ to view composites.
	 *
	 * @example
	 * // A view composite that uses preset properties and content
	 * const Card = View.compose(
	 *   (p: { title?: StringConvertible | Binding<StringConvertible> }, ...content: ViewClass[]) => (
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
	 *   // ... other views
	 * )
	 *
	 * @example
	 * // A view composite that only uses preset properties
	 * const BadgeButton = View.compose<{
	 *   label?: StringConvertible;
	 *   badge?: StringConvertible
	 * }>(
	 *   () =>
	 *     UICell.with(
	 *       { dimensions: { grow: 0 }, layout: { clip: false } },
	 *       UIOutlineButton.withLabel(bound.string("label")),
	 *       UILabel.withText(bound("badge"), myStyles.badge)
	 *     )
	 * );
	 *
	 * @example
	 * // A view composite with event handlers
	 * const CollapsingBlock = View.compose<
	 *   { title?: StringConvertible; show?: boolean },
	 *   { title: StringConvertible },
	 *   ViewClass[]
	 * >(
	 *   (p, ...content) => (
	 *     <column>
	 *       <row onClick="RowClicked">
	 *         <h3>{p.title}</h3>
	 *       </row>
	 *       <column hidden={bound.not("show")}>{content}</column>
	 *     </column>
	 *   ),
	 *   {
	 *     initialize() {
	 *       this.show = true;
	 *     },
	 *     onRowClicked() {
	 *       this.show = !this.show;
	 *     },
	 *   }
	 * );
	 *
	 * @example
	 * // A view composite that only adds event handlers
	 * const SelectOnClick = View.compose(() => {}, {
	 *   onClick() {
	 *     this.body?.emit("Select");
	 *   }
	 * });
	 *
	 * // Use like this in JSX:
	 * <SelectOnClick>
	 *   <cell> ... </cell>
	 * </SelectOnClick>
	 */
	export function compose<
		TViewProperties extends {} = {},
		TPreset extends {} = ViewComposePreset<TViewProperties>,
		TContent extends ViewClass[] = []
	>(
		f: ViewComposeFunction<TPreset, TContent>,
		extend?: ViewComposeExtend<ViewComposite & TViewProperties>
	): ComposedViewBuilder<
		Parameters<typeof f>,
		ViewComposite & TViewProperties
	> {
		// implemented in ViewComposite.ts
		throw 0;
	}
}
