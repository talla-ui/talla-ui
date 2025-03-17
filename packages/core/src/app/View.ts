import { ConfigOptions } from "@talla-ui/util";
import {
	BindingOrValue,
	isBinding,
	ObservedEvent,
	ObservedObject,
} from "../base/index.js";
import { invalidArgErr } from "../errors.js";
import { RenderContext } from "./RenderContext.js";

/** Type definition for an event that's emitted on a view object */
export type ViewEvent<
	TSource extends View = View,
	TData extends Record<string, unknown> = Record<string, unknown>,
> = ObservedEvent<TSource, TData>;

/**
 * An abstract class that represents a view
 *
 * @description
 * The view is one of the main architectural components of an application. It provides a method to render its encapsulated content, either directly or using a collection of built-in UI elements.
 *
 * Views can be rendered on their own (using {@link AppContext.render app.render()}) or included as content within another view. In most cases, a top-level view is created from the {@link Activity.createView()} method.
 *
 * The View class can't be used on its own. Instead, define views using the following classes and methods:
 * - {@link UIRenderable} classes, and the various {@link ui} factory functions (e.g. `ui.button(...)`) that create a {@link ViewBuilder} for built-in UI elements and components.
 * - For a complete UI hierarchy, use {@link UIContainer} classes such as {@link UICell}, {@link UIRow}, and {@link UIColumn}, which represent containers that contain other views (including containers).
 * - The {@link UIComponent.define()} function, which creates a {@link UIComponent} subclass.
 *
 * @see {@link UIRenderable}
 * @see {@link UIComponent}
 *
 * @docgen {hideconstructor}
 */
export abstract class View extends ObservedObject {
	/**
	 * Creates a view builder for the current view class, with the provided properties, bindings, and event handlers
	 * @param preset The properties, bindings, and event handlers to apply to each view.
	 * @returns A {@link ViewBuilder} instance that can be used to create views with the provided preset.
	 */
	static getViewBuilder(this: new () => View, preset: {}): ViewBuilder {
		return new ViewBuilder(this, preset);
	}

	/**
	 * A method that should be implemented to render a View object
	 * - The view may be rendered asynchronously, providing output as well as any updates to the provided renderer callback.
	 */
	abstract render(callback: RenderContext.RenderCallback): void;

	/** Requests input focus on the output element */
	abstract requestFocus(): void;

	/** Finds matching objects in the view hierarchy */
	abstract findViewContent<T extends View>(
		type: new (...args: any[]) => T,
	): T[];
}

/**
 * A class that provides a way to create view objects with preset properties, bindings, and event handlers
 *
 * A view builder object can be used to create instances of a view class with a specific set of properties, bindings, and event handlers applied to them. Each view builder object can be used to create multiple instances of the view class with the same preset.
 *
 * View builders are normally created using {@link ui} functions (e.g. `ui.button()`), or directly using the {@link View.getViewBuilder()} method on a view class.
 */
export class ViewBuilder<TView extends View = View> {
	/**
	 * Applies the provided preset properties, bindings, and event handlers to a view instance
	 * - This method is called by the {@link ViewBuilder.create()} method to apply a preset to the view instance, but can also be called directly to apply a preset to an existing view instance.
	 * @param view The view instance to apply the preset to
	 * @param preset The preset properties, bindings, and event handlers to apply to the view
	 * @returns The view instance (`view` parameter) itself
	 */
	static applyPreset<TView extends View>(view: TView, preset: any) {
		for (let p in preset) {
			if (p[0] === "_") continue;
			let v = (preset as any)[p];

			// intercept and/or forward events
			if (p[0] === "o" && p[1] === "n" && (p[2]! < "a" || p[2]! > "z")) {
				let eventName = p.slice(2);
				if (!v) continue;
				if (typeof v !== "string" || eventName === v) {
					throw invalidArgErr("preset." + p);
				}
				let forward = v[0] === "+";
				if (forward) v = v.slice(1);
				ObservedObject.intercept(view, eventName, (e, emit) => {
					if (forward) emit(e);
					view.emit(new ObservedEvent(v, view, e.data, undefined, e));
				});
				continue;
			}

			// ignore undefined values, unless the property was never added
			if (v === undefined && p in this) continue;

			// apply binding or set property
			if (isBinding(v)) {
				v.bindTo(view, p as any);
			} else {
				(view as any)[p] =
					(view as any)[p] instanceof ConfigOptions
						? (view as any)[p].constructor.init(v)
						: v;
			}
		}
		return view;
	}

	/** Creates a new instance for the provided view class and preset options */
	constructor(View: new () => TView, preset: any) {
		this.View = View;
		this.preset = preset;
	}

	/** The view class that this view builder is associated with */
	readonly View: new () => TView;

	/** The preset properties, bindings, and event handlers that will be applied to each view instance created by this view builder */
	readonly preset: Readonly<{}>;

	/**
	 * Creates a new view instance with this view builder's preset properties, bindings, and event handlers
	 */
	create() {
		return ViewBuilder.applyPreset(new this.View(), this.preset);
	}

	/**
	 * Registers a callback function that initializes all new view instances after they have been created
	 * @param init A function that initializes the view instance after it has been created
	 */
	addInitializer(init: (view: TView) => void): this {
		let create = this.create;
		this.create = function () {
			let result = create.call(this);
			init(result);
			return result;
		};
		return this;
	}
}

export namespace ViewBuilder {
	/**
	 * Type definition for the preset object that can be passed to a view builder
	 * @summary This type is used to put together the object type for e.g. `ui.cell(...)`, based on the provided type parameters.
	 * - `TBaseClass` is used to infer the type of the parameter accepted by {@link View.getViewBuilder()} on a subclass.
	 * - `TView` is used to infer property types.
	 * - `K` is a string type containing all properties to take from TView.
	 */
	export type ExtendPreset<
		TBaseClass,
		TView = any,
		K extends keyof TView = never,
	> = TBaseClass extends {
		getViewBuilder(preset: infer P): ViewBuilder;
	}
		? P & {
				[P in K]?: TView[P] extends ConfigOptions
					? ConfigOptions.Arg<TView[P]>
					: BindingOrValue<TView[P]>;
			}
		: never;
}
