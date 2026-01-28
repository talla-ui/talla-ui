import { ERROR, err } from "../errors.js";
import { Binding, ObservableEvent, ObservableObject } from "../object/index.js";
import { RenderContext } from "./RenderContext.js";
import { View } from "./View.js";
import { ViewBuilder, ViewBuilderFunction } from "./ViewBuilder.js";

/**
 * A base class that represents a reusable UI component with encapsulated state
 *
 * @description
 * Widgets are view objects that may include their own state (properties) and event handlers, to render their own view body content.
 *
 * To be able to use widgets in the view hierarchy, you should also export a builder function that uses the static {@link Widget.builder()} method.
 *
 * For views that require a custom renderer (e.g. a platform-dependent graphic), define a view class that extends {@link Widget}, and overrides the {@link Widget.render} method altogether.
 *
 * @note Widgets are very similar to {@link Activity} objects, but they don't have an active/inactive lifecycle and typically don't include any application logic (especially not for loading or saving data).
 *
 * @example
 * // Define a widget class to store view state
 * class CollapsibleWidget extends Widget {
 *   expanded = false;
 *   onToggle() {
 *     this.expanded = !this.expanded;
 *   }
 * }
 *
 * // Export a builder function that uses the class
 * function Collapsible(title: StringConvertible, ...content: ViewBuilder[]) {
 *   let width = 300;
 *   return CollapsibleWidget.builder((v) =>
 *     UI.Column()
 *       .width(width, undefined, "100%")
 *       .with(
 *         UI.Text(title)
 *           .icon(v.bind("expanded").then("chevronDown", "chevronNext"))
 *           .cursor("pointer")
 *           .onClick("Toggle"),
 *         UI.ShowWhen(v.bind("expanded"), UI.Column(...content)),
 *       )
 *   ).extend({
 *     expand(set = true) {
 *       this.initializer.set("expanded", set);
 *       return this;
 *     },
 *     width(w: number) {
 *       width = w;
 *       return this;
 *     },
 *   });
 * }
 */
export class Widget extends View {
	/**
	 * Creates a widget builder for this class
	 *
	 * @summary
	 * This static method creates a builder object that can be used to construct instances
	 * of the widget class. The builder provides a fluent interface similar to
	 * {@link UIElement.ElementBuilder}, with methods for configuration and extension.
	 *
	 * @description
	 * The builder manages a {@link ViewBuilder.Initializer} that handles property setting,
	 * bindings, and event handlers. The view function is called lazily on first build,
	 * and its result is cached for subsequent builds.
	 *
	 * The returned builder object exposes:
	 * - `initializer` - The {@link ViewBuilder.Initializer} for setting properties and handlers
	 * - `build()` - Creates a new instance of the widget
	 * - `apply()` - Applies a modifier function to the builder
	 * - `extend()` - Extends the builder with custom methods
	 *
	 * @param defineView Optional function that receives a binding to the widget instance
	 * and returns a view builder defining the widget's body. If not provided, the body
	 * can be set via the `defer` callback in {@link Widget.Builder.extend}, or by
	 * overriding the {@link Widget.body} getter in the class itself.
	 * @returns A widget builder object
	 *
	 * @example
	 * class MyCounterWidget extends Widget {
	 *   value = 0;
	 *   onIncrement() { this.value++; }
	 * }
	 *
	 * function MyCounter() {
	 *   return MyCounterWidget.builder((v) =>
	 *     UI.Row(
	 *       UI.Text(v.bind("value")),
	 *       UI.Button("+").onClick("Increment"),
	 *     )
	 *   ).extend({
	 *     initialValue(n: number) {
	 *       this.initializer.set("value", n);
	 *       return this;
	 *     },
	 *   });
	 * }
	 */
	static builder<T extends Widget>(
		this: new () => T,
		defineView?: (v: Binding<T>) => ViewBuilder,
	): Widget.Builder<T> {
		const ViewClass = this;
		const symbol = Symbol("Widget");
		const binding = new Binding<T>(symbol);
		let cachedBuilder: ViewBuilder | undefined;

		const initializer = new ViewBuilder.Initializer<T>(ViewClass, (view) => {
			// Add symbol property for binding resolution
			Object.defineProperty(view, symbol, { value: view });
		});

		// Set up lazy body getter only if defineView is provided
		if (defineView) {
			initializer.initialize((view) => {
				let body: View | undefined;
				Object.defineProperty(view, "body", {
					get() {
						if (body) return body;
						if (!cachedBuilder) cachedBuilder = defineView(binding);
						return (body = cachedBuilder.build());
					},
				});
			});
		}

		const result: Widget.Builder<T> = {
			initializer,
			build() {
				if (defineView && !cachedBuilder) cachedBuilder = defineView(binding);
				return initializer.build();
			},
			apply<TResult extends ViewBuilder = Widget.Builder<T>>(
				modifier?: ViewBuilderFunction<TResult, Widget.Builder<T>>,
			): TResult {
				return modifier ? modifier(this as any) : (this as any);
			},
			extend<E extends object>(
				this: Widget.Builder<T>,
				extensions: E & ThisType<Widget.Builder<T> & E>,
				defer?: (
					result: Widget.Builder<T> & E,
					base: Widget.Builder<T>,
				) => void,
			): Widget.Builder<T> & E {
				const base = this;
				const extended = Object.create(base);
				Object.defineProperties(
					extended,
					Object.getOwnPropertyDescriptors(base),
				);
				return Object.assign(extended, extensions, {
					build: () => {
						if (defer) defer(extended, base);
						defer = undefined;
						return base.build.call(extended);
					},
				});
			},
		};

		return result;
	}

	/**
	 * The encapsulated view object, an attached view
	 * - By default, this getter property always returns `undefined`. When using {@link Widget.builder()}, this property is overridden to expose a view object created from the provided view builder.
	 * - Alternatively, you can implement this property using a getter that returns a View. Typically, the view is created using a view builder which is cached for all instances of the widget.
	 */
	protected get body(): View | undefined {
		return undefined;
	}

	/**
	 * Searches the view hierarchy for view objects of the provided type
	 * @summary This method looks for matching view objects in the current view structure — including the view itself. If a view object is an instance of the provided class, it's added to the list. Objects _within_ matching views aren't searched for further matches.
	 * @param type A view class
	 * @returns An array with instances of the provided view class; may be empty but never undefined.
	 */
	findViewContent<T extends View>(type: new (...args: any[]) => T): T[] {
		return this._rendered
			? this._rendered instanceof type
				? [this._rendered]
				: this._rendered.findViewContent(type)
			: [];
	}

	/**
	 * Requests input focus on the contained view object
	 * - This method should be overridden if input focus should be requested on another element than the view body itself.
	 */
	requestFocus() {
		this._rendered?.requestFocus();
	}

	/**
	 * Delegates incoming events to methods of this object, notably from the attached view body
	 * - This method is called automatically when an event is emitted by the encapsulated view object.
	 * - The base implementation calls methods starting with `on`, e.g. `onClick` for a `Click` event. The event is passed as a single argument, and the return value should either be `true` (event handled), false/undefined, or a promise (which is awaited just to be able to handle any errors).
	 * @param event The event to be delegated
	 * @returns The result of the event handler method, or undefined.
	 * @see {@link ObservableObject.attach}
	 * @see {@link ObservableObject.EventDelegate}
	 */
	delegate(event: ObservableEvent): Promise<boolean | void> | boolean | void {
		return (this as any)["on" + event.name]?.(event);
	}

	/**
	 * A method that's called before the view is rendered, to be overridden if needed
	 * - The default implementation emits a `BeforeRender` event. The event is never propagated because of the {@link ObservableEvent.noPropagation} flag.
	 */
	protected beforeRender(view: View) {
		this.emit(
			new ObservableEvent("BeforeRender", this, undefined, undefined, true),
		);
	}

	/**
	 * Creates and renders the encapsulated view body, if any
	 * - This method is called automatically whenever required. It's not necessary to invoke this method from an application.
	 * - This method may be overridden to render custom platform-dependent content.
	 */
	render(callback: RenderContext.RenderCallback) {
		let view = this._rendered || this.body;
		if (!view || !(view instanceof View) || view.isUnlinked()) {
			throw err(ERROR.View_Invalid);
		}

		// attach view body if needed
		let origin = ObservableObject.whence(view);
		if (!origin) this.attach(view, { delegate: this });
		else if (origin !== this) throw err(ERROR.View_NotAttached);

		// invoke beforeRender if needed and render body
		if (!this._rendered) this.beforeRender(view);
		this._rendered = view;
		view.render(callback);
	}

	private _rendered?: View;
}

export namespace Widget {
	/**
	 * A builder interface for widgets created by {@link Widget.builder()}
	 *
	 * @description
	 * This interface defines the structure of the builder object returned by the static
	 * `builder()` method on Widget subclasses. It provides a fluent interface
	 * for configuring widget instances.
	 */
	export interface Builder<
		TView extends Widget = Widget,
	> extends ViewBuilder<TView> {
		/** The initializer instance that handles view configuration */
		initializer: ViewBuilder.Initializer<TView>;

		/**
		 * Creates a new instance of the widget along with its body
		 * @returns A newly created and initialized widget instance
		 */
		build(): TView;

		/**
		 * Applies a view builder function, returning its result
		 * @param modifier A function that takes the current builder instance and applies configurations.
		 * @returns The result of the function.
		 */
		apply<TResult extends ViewBuilder = this>(
			modifier?: ViewBuilderFunction<TResult, this>,
		): TResult;

		/**
		 * Extends this builder with custom methods, returning a new builder object
		 *
		 * @description
		 * The returned object inherits all base builder methods via prototype chain.
		 * Extension methods can access base builder methods via `this`. Note that all
		 * extension methods **must** return `this`.
		 *
		 * The optional `defer` callback runs exactly once, on the first call to `build()`.
		 * Use `defer` to finalize configuration that depends on closure variables set by custom methods.
		 *
		 * @param extensions An object containing custom methods to add to the builder.
		 * @param defer Optional callback invoked once before building.
		 * @returns A new builder with both the original and extension methods.
		 */
		extend<E extends object>(
			extensions: E & ThisType<this & E>,
			defer?: (result: this & E, base: this) => void,
		): this & E;
	}
}
