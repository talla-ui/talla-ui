import {
	Binding,
	BindingOrValue,
	isBinding,
	ManagedEvent,
	ManagedObject,
} from "../base/index.js";
import { invalidArgErr } from "../errors.js";
import { RenderContext } from "./RenderContext.js";

/** Type definition for a constructor that instantiates a {@link View} object */
export type ViewClass<T extends View = View> = new (...args: any[]) => T;

/** Type definition for an event that's emitted on a view object */
export type ViewEvent<
	TSource extends View = View,
	TData extends Record<string, unknown> = Record<string, unknown>,
> = ManagedEvent<TSource, TData>;

/**
 * An abstract class that represents a view
 *
 * @description
 * The view is one of the main architectural components of an application. It provides a method to render its encapsulated content, either directly or using a collection of built-in UI components.
 *
 * Views can be rendered on their own (using {@link AppContext.render app.render()}) or included as content within another view. In most cases, a top-level view is created from the {@link Activity.createView()} method.
 *
 * The View class can't be used on its own. Instead, define views using the following classes and methods:
 * - {@link UIComponent} classes, and the various {@link ui} factory functions (e.g. `ui.button(...)`) that create **preset** constructors for built-in UI components.
 * - Specifically, {@link UIContainer} classes such as {@link UICell}, {@link UIRow}, and {@link UIColumn}, which represent containers that contain further UI components (and containers). These can be used to lay out your UI.
 * - Built-in {@link ViewComposite} classes, which control an encapsulated view — such as {@link UIConditionalView} and {@link UIListView}.
 * - The {@link ViewComposite.define()} function, which creates a custom {@link ViewComposite} subclass.
 *
 * Use the View class itself as a _type_, along with {@link ViewClass}, when referencing variables or parameters that should refer to any other view.
 *
 * @see {@link UIComponent}
 * @see {@link ViewComposite}
 *
 * @docgen {hideconstructor}
 */
export abstract class View extends ManagedObject {
	/**
	 * A method that should be implemented to render a View object
	 * - The view may be rendered asynchronously, providing output as well as any updates to the provided renderer callback.
	 */
	abstract render(callback: RenderContext.RenderCallback): void;

	/**
	 * Render placement options used when this view is rendered directly
	 * - This property is only relevant when the view is rendered directly, e.g. as the view of an activity.
	 * - Use {@link ui.page()}, {@link ui.mount()}, or the JSX `<mount>` tag to control placement options in a preset view hierarchy.
	 */
	renderPlacement?: RenderContext.PlacementOptions;

	/** A method that should be implemented to request input focus on the view output element */
	abstract requestFocus(): void;

	/** A method that should be implemented to find matching components in the view hierarchy */
	abstract findViewContent<T extends View>(type: ViewClass<T>): T[];

	/**
	 * Applies the provided preset properties to this object
	 *
	 * @summary This method is called from the constructor of **preset** view classes, e.g. the result of `ui.label(...)` and {@link ViewComposite.define()}. The provided object may contain property values, bindings, and event specifiers.
	 *
	 * **Property values** — These are set directly on the view object. Each property is set to the corresponding value. However, property names starting with an underscore are ignored. Undefined preset property values are also ignored, except if the property was never set before on the target view (i.e. initializing a new undefined property).
	 *
	 * **Bindings** — These are applied on properties the view object. Each property may be bound using an instance of the {@link Binding} class (i.e. the result of {@link bind()}), creating the target property and taking effect immediately.
	 *
	 * **Events** — Events can be handled in two ways, depending on the value of the `on...` property:
	 * - `onClick: "RemoveItem"` — this intercepts `Click` events and emits `RemoveItem` events instead. The {@link ManagedEvent.inner} property is set to the original `Click` event.
	 * - `onClick: "+RemoveItem"` — this intercepts `Click` events and emits _both_ the original `Click` event as well as a new `RemoveItem` event. The {@link ManagedEvent.inner} property of the second event refers to the original `Click` event.
	 *
	 * @note This method is called automatically. Do not call this method after constructing a view object.
	 */
	applyViewPreset(preset?: {}) {
		if (!preset) return;
		let events: { [eventName: string]: string } | undefined;
		for (let p in preset) {
			if (p[0] === "_") continue;
			let v = (preset as any)[p];

			// intercept and/or forward events: remember all first
			if (p[0] === "o" && p[1] === "n" && (p[2]! < "a" || p[2]! > "z")) {
				if (v) {
					// add event handler: forward or substitute event
					let eventName = p.slice(2);
					if (typeof v !== "string" || eventName === v) {
						throw invalidArgErr("preset." + p);
					}
					(events ||= Object.create(null))[eventName] = v;
				}
				continue;
			}

			// ignore undefined values, unless the property was never added
			if (v === undefined && p in this) continue;

			// apply binding or set property
			isBinding(v) ? v.bindTo(this, p as any) : ((this as any)[p] = v);
		}

		// override emit method if forwarding or intercepting events
		if (events) {
			let _emit = this.emit.bind(this);
			this.emit = function emit(event, data?: any) {
				if (event === undefined) return this;
				if (typeof event === "string") {
					event = new ManagedEvent(event, this, data);
				} else {
					data = event.data;
				}

				// check for event intercept/forward
				let v = events![event.name];
				if (!v) return _emit(event);

				// if forward, emit original event first
				if (v[0] === "+") {
					_emit(event);
					v = v.slice(1);
				}

				// add 'target' data property if needed
				let colonIndex = v.indexOf(":");
				if (colonIndex > 0) {
					data = { target: v.slice(colonIndex + 1) };
					v = v.slice(0, colonIndex);
				}

				// emit intercept event with original event as `inner`
				event = new ManagedEvent(v, this, data, undefined, event);
				return this.emit(event);
			};
		}
	}
}

export namespace View {
	/**
	 * Type definition for the object that can be used to initialize a preset view
	 * @summary This type is used to put together the object type for e.g. `ui.cell(...)`, based on the provided type parameters.
	 * - TBase is used to infer the type of the parameter accepted by {@link View.applyViewPreset()} on a subclass.
	 * - TView is used to infer the type of a property.
	 * - K is a string type containing all properties to take from TView.
	 */
	export type ExtendPreset<
		TBase extends View,
		TView = any,
		K extends keyof TView = never,
	> = TBase extends {
		applyViewPreset(preset: infer P): void;
	}
		? P & { [P in K]?: BindingOrValue<TView[P]> }
		: never;
}
