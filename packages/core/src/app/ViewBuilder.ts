import {
	BindingOrValue,
	isBinding,
	ObservableEvent,
	ObservableObject,
} from "../object/index.js";
import type { CustomView } from "./CustomView.js";
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
 * @see {@link CustomViewBuilder}
 */
export interface ViewBuilder<TView extends View = View> {
	/**
	 * Creates a new instance of the view using the embedded initializer
	 * @returns A newly created and initialized view instance
	 */
	create(): TView;
}

export namespace ViewBuilder {
	/**
	 * A class that handles the initialization and configuration of views, as part of a view builder
	 *
	 * @description
	 * The Initializer class provides methods to configure view properties, bindings, event handlers, and initialization callbacks. It provides the implementation for fluent configuration methods on {@link ViewBuilder} interfaces, for many types of built-in view builders as well as custom view classes.
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
			if (initialize) this._before.push(initialize);
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
			this._before.push(callback);
		}

		/**
		 * Registers a callback to be called after view initialization is complete
		 * @note The provided callback will be invoked after all properties have been set and bindings have been applied. This is useful for performing final setup or validation.
		 * @param callback The finalization callback that receives the view instance
		 */
		finalize(callback: (view: TView) => void) {
			this._after.push(callback);
		}

		/**
		 * Registers an update handler for a value or binding
		 *
		 * @description
		 * This method allows you to specify a custom handler that will be called immediately for a view instance (for a static value), or whenever a bound value changes (for a binding). This is useful for implementing a fluent interface that isn't mapped directly to a single view property.
		 * @param valueOrBinding The value or binding to use
		 * @param handle The handler function to call when the value changes
		 */
		update(valueOrBinding: any, handle: (this: TView, value: any) => void) {
			this._after.push((view) => {
				if (isBinding(valueOrBinding)) {
					view.observe(valueOrBinding, handle);
				} else {
					handle.call(view, valueOrBinding);
				}
			});
		}

		/**
		 * Configures event handling to emit an aliased event or call a function
		 *
		 * @description
		 * This method intercepts events with the specified name and re-emits them with an alias, or calls a function. If the `forward` parameter is true, the original event will also be forwarded.
		 *
		 * Typically, an aliased event is used to handle events at the parent level, e.g. in an activity. In some cases, a function can be used to handle the event.
		 *
		 * @param eventName The name of the event to intercept
		 * @param alias The alias to emit instead, or a function to call
		 * @param data The data properties to add to the alias event, if any
		 * @param forward Whether to forward the original event as well (defaults to false)
		 */
		intercept(
			eventName: string,
			alias: string | ObservableObject.InterceptHandler<TView>,
			data?: Record<string, unknown>,
			forward?: boolean,
		) {
			if (typeof alias === "string") {
				let a = alias;
				alias = function (e, emit) {
					if (forward) emit(e);
					let eventData = data ? { ...e.data, ...data } : e.data;
					this.emit(new ObservableEvent(a, this, eventData, undefined, e));
				};
			}
			this._intercept[eventName] = alias;
		}

		/**
		 * Creates and initializes a new view instance
		 *
		 * @description
		 * This method creates a new instance of the view class and applies all configured properties, bindings, callbacks, and event interceptors.
		 *
		 * The following steps are performed in order:
		 * 1. Run all initialization callbacks
		 * 2. Set properties and apply bindings
		 * 3. Run all finalization callbacks
		 * 4. Set up event interceptors
		 *
		 * @returns A fully initialized view instance
		 */
		create() {
			return this._apply(new this.ViewClass());
		}

		/**
		 * Applies all configuration to a view instance
		 *
		 * @description
		 * This private method handles the actual application of all configured settings to a view instance. It executes in the following order:
		 * 1. Runs all initialization callbacks
		 * 2. Sets properties and applies bindings
		 * 3. Runs all finalization callbacks
		 * 4. Sets up event interceptors
		 *
		 * @param view The view instance to configure
		 * @returns The configured view instance
		 */
		private _apply(view: TView) {
			// call initialize(...) callbacks
			for (let f of this._before) f(view);

			// set properties, or apply bindings
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

			// call finalize(...) callbacks
			for (let f of this._after) f(view);

			// add event intercepts
			for (let eventName in this._intercept) {
				ObservableObject.intercept(
					view,
					eventName,
					this._intercept[eventName]!,
				);
			}
			return view;
		}

		private _before: ((view: TView) => void)[] = [];
		private _after: ((view: TView) => void)[] = [];
		private _properties: Record<string, any> = {};
		private _intercept: Record<
			string,
			ObservableObject.InterceptHandler<TView>
		> = {};
	}
}

/**
 * A view builder that encapsulates a function to define a view builder lazily
 * - This function is helpful for creating view builders that may require further configuration after being returned from a function.
 * - The encapsulated function is called only once, before the first view is created.
 *
 * @example
 * ```ts
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
 * ```
 */
export const DeferredViewBuilder = function (define: () => ViewBuilder) {
	return {
		create() {
			let builder = _deferredBuilders.get(define);
			if (!builder) _deferredBuilders.set(define, (builder = define()));
			return builder.create();
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
 * A view builder that encapsulates a custom view class and a function to define its body
 * - The view class is used to create each view instance.
 * - The encapsulated function is called only once, before the first view is created, to define the body of the view.
 *
 * @example
 * ```ts
 * class MyWrapper extends CustomView {
 *   label = "";
 * }
 *
 * function MyWrapper() {
 *   return {
 *     ...CustomViewBuilder(MyWrapper, () => UI.Button(bind("label"))),
 *     label(label: BindingOrValue<StringConvertible>) {
 *       this.initializer.set("label", label);
 *       return this;
 *     },
 *   }
 * }
 * ```
 */
export const CustomViewBuilder = function (
	ViewClass: new () => View,
	defineBody: () => ViewBuilder,
) {
	let initializer = new ViewBuilder.Initializer(ViewClass);
	initializer.initialize((view) => {
		let builder = _deferredBuilders.get(defineBody);
		if (!builder) _deferredBuilders.set(defineBody, (builder = defineBody()));
		(view as any).createViewBody = () => builder.create();
	});
	return {
		initializer,
		create: initializer.create.bind(initializer),
		intercept(eventName, alias, data, forward) {
			initializer.intercept(eventName, alias as any, data, forward);
			return this;
		},
	};
} as CustomViewBuilder.Type;

export interface CustomViewBuilder<TView extends CustomView = CustomView> {
	/** An initializer for each view to be created */
	initializer: ViewBuilder.Initializer<TView>;

	/**
	 * Creates a new instance of the custom view along with its body
	 * @returns A newly created and initialized custom view instance
	 */
	create: () => TView;

	/**
	 * Configures event handling to emit an aliased event or call a function
	 *
	 * @description
	 * This method intercepts events with the specified name and re-emits them with an alias, or calls a function. If the `forward` parameter is true, the original event will also be forwarded.
	 *
	 * Typically, an aliased event is used to handle events at the parent level, e.g. in an activity. In some cases, a function can be used to handle the event.
	 *
	 * @param eventName The name of the event to intercept
	 * @param alias The alias to emit instead, or a function to call
	 * @param data The data properties to add to the alias event, if any
	 * @param forward Whether to forward the original event as well (defaults to false)
	 */
	intercept: <T>(
		this: T,
		eventName: string,
		alias: string | ObservableObject.InterceptHandler<TView>,
		data?: Record<string, unknown>,
		forward?: boolean,
	) => T;
}

export declare namespace CustomViewBuilder {
	/** The type of the CustomViewBuilder function, usable both as a function and constructor */
	export interface Type {
		new <TView extends CustomView = CustomView>(
			ViewClass: new () => TView,
			defineBody: () => ViewBuilder,
		): CustomViewBuilder<TView>;
		<TView extends CustomView = CustomView>(
			ViewClass: new () => TView,
			defineBody: () => ViewBuilder,
		): CustomViewBuilder<TView>;
	}
}
