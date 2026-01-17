import {
	Binding,
	BindingOrValue,
	isBinding,
	ObservableEvent,
	ObservableObject,
} from "../object/index.js";
import type { FormState } from "./FormState.js";
import type { View } from "./View.js";

/**
 * An interface for objects that build pre-configured view instances
 *
 * @description
 * Classes that extend this type (such as {@link UIButton.ButtonBuilder}) typically provide a fluent interface for creating and configuring views. They use a {@link ViewBuilder.Initializer} to configure the initialization logic, including property setting, binding, event interception, and initialization callbacks (e.g. for adding content to container views), and expose this functionality using methods on the builder class.
 *
 * @see {@link Widget.builder}
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
	 * The Initializer class provides methods to configure view properties, bindings, event handlers, and initialization callbacks. It provides the implementation for fluent configuration methods on {@link ViewBuilder} interfaces, for many types of built-in view builders as well as widget classes.
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
		 * Registers a two-way binding between a view property and a bound form state field.
		 * @param formState A binding to a form state object (e.g. on an activity).
		 * @param formField The name of the form field to which the value should be bound.
		 * @param property The view property to bind to.
		 * @param formChanged A function that will be called when the form state is updated, which should take the current form state object and return the value to be set on the view's own property; if not provided, the value will be set directly using the form field.
		 */
		observeFormState(
			formState: Binding<FormState | undefined>,
			formField: string,
			property: string & keyof TView,
			formChanged?: (formState: FormState) => unknown,
		) {
			this._final.push((view) => {
				let current: FormState | undefined;
				view.observe(formState as any, (formState) => {
					current = formState;
					if (formState) {
						view[property] = formChanged
							? formChanged(formState)
							: formState.values[formField];
					}
				});
				view.observe(property, (value) => {
					current?.set(formField, value);
				});
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
			handle: string | ViewBuilderEventHandler<TView, any>,
		) {
			this._final.push((view) => {
				ObservableObject.intercept(view, eventName, handle as any);
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

/** A type of function that returns a view builder, often provided with the same type of view builder as an argument */
export type ViewBuilderFunction<TResult extends ViewBuilder, TArg = TResult> = (
	arg: TArg,
) => TResult;

/**
 * A type of event handler that can be added by a view builder
 * @note The view that the handler listens to (passed as a second argument) may not be the event source, since an event may have originated from within the view hierarchy.
 */
export type ViewBuilderEventHandler<TView extends View = View, TData = {}> = (
	event: ObservableEvent<View, Record<string, unknown> & TData>,
	view: TView,
) => void;
