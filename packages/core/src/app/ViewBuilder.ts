import {
	Binding,
	BindingOrValue,
	isBinding,
	ObservableEvent,
	ObservableObject,
} from "../object/index.js";
import type { ComponentView } from "./ComponentView.js";
import type { View } from "./View.js";

/** Cache of created view builders */
const _deferredBuilders = new WeakMap<Function, ViewBuilder>();

/**
 * An interface for objects that build pre-configured view instances
 *
 * @description
 * Classes that extend this type (such as {@link UIButton.ButtonBuilder}) typically provide a fluent interface for creating and configuring views. They use a {@link ViewBuilder.Initializer} to configure the initialization logic, including property setting, binding, event interception, and initialization callbacks (e.g. for adding content to container views), and expose this functionality using methods on the builder class.
 *
 * @see {@link DeferredViewBuilder}
 * @see {@link ComponentViewBuilder}
 */
export interface ViewBuilder<TView extends View = View> {
	/**
	 * Creates a new instance of the view using the embedded initializer
	 * @returns A newly created and initialized view instance
	 */
	build(): TView;
}

export namespace ViewBuilder {
	/**
	 * A class that handles the initialization and configuration of views, as part of a view builder
	 *
	 * @description
	 * The Initializer class provides methods to configure view properties, bindings, event handlers, and initialization callbacks. It provides the implementation for fluent configuration methods on {@link ViewBuilder} interfaces, for many types of built-in view builders as well as component view classes.
	 */
	export class Initializer<TView extends View> {
		/**
		 * Creates a new initializer for the specified view class
		 * @param ViewClass The view class constructor
		 */
		constructor(
			ViewClass: new () => TView,
			initialize?: (view: TView) => void,
		) {
			this.ViewClass = ViewClass;
			if (initialize) this._init.push(initialize);

			// before finalize, set properties, or apply bindings
			this._final.push((view) => {
				for (let p in this._properties) {
					let valueOrBinding = this._properties[p];
					if (isBinding(valueOrBinding)) {
						if (!(p in view)) (view as any)[p] = undefined;
						view.observe(valueOrBinding, (v) => {
							(view as any)[p] = v;
						});
					} else {
						(view as any)[p] = valueOrBinding;
					}
				}
			});
		}

		/** The view class constructor that will be used to create instances */
		readonly ViewClass: new () => TView;

		/**
		 * Sets a property value or binding on each view instance after it is created
		 *
		 * @description
		 * This method allows setting either a static value or a binding for any property of the view. If a binding is provided, it will be automatically bound after the view is created.
		 *
		 * @param name The name of the property to set
		 * @param valueOrBinding The value or binding to set for the property
		 */
		set<
			K extends string &
				keyof {
					[P in keyof TView as TView[P] extends Function ? never : P]: TView[P];
				},
		>(name: K, valueOrBinding: BindingOrValue<TView[K]>) {
			this._properties[name] = valueOrBinding;
		}

		/**
		 * Registers a callback to be called during view initialization
		 * @note The provided callback will be invoked after the view instance is created but before properties are set. This is useful for performing early initialization logic.
		 * @param callback The initialization callback that receives the view instance
		 */
		initialize(callback: (view: TView) => void) {
			this._init.push(callback);
		}

		/**
		 * Registers a callback to be called after view initialization is complete
		 * @note The provided callback will be invoked after all properties have been set and bindings have been applied. This is useful for performing final setup or validation.
		 * @param callback The finalization callback that receives the view instance
		 */
		finalize(callback: (view: TView) => void) {
			this._final.push(callback);
		}

		/**
		 * Registers an update handler for a value or binding
		 *
		 * @description
		 * This method allows you to specify a handler that will be called immediately for a view instance (for a static value), or whenever a bound value changes (for a binding). This is useful for implementing a fluent interface that isn't mapped directly to a single view property.
		 * @param valueOrBinding The value or binding to use
		 * @param handle The handler function to call when the value changes
		 */
		update(valueOrBinding: any, handle: (this: TView, value: any) => void) {
			this._final.push((view) => {
				if (isBinding(valueOrBinding)) {
					view.observe(valueOrBinding, handle);
				} else {
					handle.call(view, valueOrBinding);
				}
			});
		}

		/**
		 * Intercepts events with the specified name on all view instances
		 *
		 * @description
		 * This method intercepts events with the specified name on all view instances, and calls the provided function when the event would be emitted. The function is called with the event and the view instance itself as arguments.
		 *
		 * If a string is provided instead, a new event with that name is emitted, replacing the original event. The new event may be intercepted by another handler on the same view, and retains the original event data.
		 *
		 * The handler function may re-emit the original event as well as any other events. To avoid an endless loop, the function should only emit events with the same name (including the original event) with the `noIntercept` parameter set to true in the call to {@link ObservableObject.emit()}.
		 *
		 * @param eventName The name of the event to intercept
		 * @param handle The function to call, or name of the event to emit instead
		 *
		 * @see {@link ObservableObject.intercept}
		 */
		handle(
			eventName: string,
			handle: string | ((event: ObservableEvent, view: TView) => void),
		) {
			this._final.push((view) => {
				ObservableObject.intercept(view, eventName, handle);
			});
		}

		/**
		 * Creates and initializes a new view instance
		 *
		 * @description
		 * This method creates a new instance of the view class and runs all configuration callbacks.
		 * @returns A fully initialized view instance
		 */
		build() {
			let result = new this.ViewClass();
			for (let f of this._init) f(result);
			for (let f of this._final) f(result);
			return result;
		}

		private _init: ((view: TView) => void)[] = [];
		private _final: ((view: TView) => void)[] = [];
		private _properties: Record<string, any> = {};
	}
}

/**
 * A view builder that encapsulates a function to define a view builder lazily
 * - This function is helpful for creating view builders that may require further configuration after being returned from a function.
 * - The encapsulated function is called only once, before the first view is created.
 *
 * @example
 * function MyButton() {
 *   let label = "";
 *   return {
 *     ...DeferredViewBuilder(() => UI.Button(label)),
 *     label(label: BindingOrValue<StringConvertible>) {
 *       label = label;
 *       return this;
 *     },
 *   }
 * }
 */
export const DeferredViewBuilder = function (define: () => ViewBuilder) {
	return {
		build() {
			let builder = _deferredBuilders.get(define);
			if (!builder) _deferredBuilders.set(define, (builder = define()));
			return builder.build();
		},
	};
} as DeferredViewBuilder.Type;

export declare namespace DeferredViewBuilder {
	/** The type of the DeferredViewBuilder function, usable both as a function and constructor */
	export interface Type {
		new <TView extends View = View>(
			define: () => ViewBuilder<TView>,
		): ViewBuilder<TView>;
		<TView extends View = View>(
			define: () => ViewBuilder<TView>,
		): ViewBuilder<TView>;
	}
}

/**
 * A view builder for a component view class with a function to define its body
 * - The view class is used to create each view instance.
 * - The encapsulated view builder function is called only once, before the first view is created, to define the body of the view.
 *
 * @example
 * class MyWrapper extends ComponentView {
 *   label = "";
 * }
 *
 * function MyWrapper() {
 *   return {
 *     ...ComponentViewBuilder(MyWrapper, (v) => UI.Button(v.bind("label"))),
 *     label(label: BindingOrValue<StringConvertible>) {
 *       this.initializer.set("label", label);
 *       return this;
 *     },
 *   }
 * }
 */
export const ComponentViewBuilder = function (
	ViewClass: new () => View,
	viewBuilder?: (binding: Binding) => ViewBuilder,
) {
	let symbol = Symbol("ComponentView");
	let initializer = new ViewBuilder.Initializer(ViewClass, (view) => {
		// add a symbol property to the view for binding to the view instance
		Object.defineProperty(view, symbol, { value: view });
	});
	if (viewBuilder) {
		initializer.initialize((view) => {
			let body: View | undefined;
			Object.defineProperty(view, "body", {
				get() {
					if (body) return body;
					let builder = _deferredBuilders.get(viewBuilder);
					if (!builder) {
						builder = viewBuilder(new Binding(symbol));
						_deferredBuilders.set(viewBuilder, builder);
					}
					return (body = builder.build());
				},
			});
		});
	}
	return {
		initializer,
		build: initializer.build.bind(initializer),
	};
} as ComponentViewBuilder.Type;

export declare namespace ComponentViewBuilder {
	/** The type of the ComponentViewBuilder function, usable both as a function and constructor */
	export interface Type {
		new <TView extends ComponentView = ComponentView>(
			ViewClass: new () => TView,
			viewBuilder?: (binding: Binding<TView>) => ViewBuilder,
		): ComponentViewBuilder<TView>;
		<TView extends ComponentView = ComponentView>(
			ViewClass: new () => TView,
			viewBuilder?: (binding: Binding<TView>) => ViewBuilder,
		): ComponentViewBuilder<TView>;
	}
}

export interface ComponentViewBuilder<
	TView extends ComponentView = ComponentView,
> {
	/** An initializer for each view to be created */
	initializer: ViewBuilder.Initializer<TView>;

	/**
	 * Creates a new instance of the component view along with its body
	 * @returns A newly created and initialized component view instance
	 */
	build: () => TView;
}
