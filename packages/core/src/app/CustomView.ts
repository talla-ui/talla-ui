import { ERROR, err } from "../errors.js";
import { ObservableEvent, ObservableObject } from "../object/index.js";
import { RenderContext } from "./RenderContext.js";
import { View, ViewBuilder } from "./View.js";

/**
 * A class that encapsulates custom view content
 *
 * @description
 * Custom views are view objects that may include their own state (properties) and event handlers, to render their own content.
 *
 * When defining a reusable custom view, you should export a builder function that calls and returns the result of the static {@link CustomView.builder} method. The builder function can be used from a parent view builder, and will return a builder object that can be extended with custom methods.
 *
 * For views that require a custom renderer (e.g. a platform-dependent graphic), define a view class that extends {@link CustomView}, and overrides the {@link CustomView.render} method altogether. In this case, the view builder should not include any content.
 *
 * @note Custom views are very similar to {@link Activity} objects, but they don't have an active/inactive lifecycle and typically don't include any application logic (especially not for loading or saving data).
 *
 * @example
 * // Define a basic custom view
 * export const MyTitle = (title: StringConvertible) =>
 *   CustomView.builder(() => UI.Label(title).labelStyle("title"));
 *
 * @example
 * // Defined a basic custom view with additional builder methods
 * export function MyTitle(title: StringConvertible) {
 *   let width: BindingOrValue<number | undefined>;
 *   return CustomView.builder(() => UI.Label(title).labelStyle("title").width(width), {
 *     width(w: BindingOrValue<number | undefined>) {
 *       width = w;
 *     },
 *   });
 * }
 *
 * @example
 * // Define a custom view using a class to encapsulate view state
 * export class CollapsibleView extends CustomView {
 *   expanded = false;
 *   onToggle() {
 *     this.expanded = !this.expanded;
 *   }
 * }
 *
 * // Export a builder function that uses the class
 * export function Collapsible(title: StringConvertible, ...content: ViewBuilder[]) {
 *   return CollapsibleView.builder(
 *     () =>
 *        UI.Column(
 *          UI.Label(title)
 *            .icon(bind("expanded").then("chevronDown", "chevronNext"))
 *            .cursor("pointer")
 *            .intercept("Click", "Toggle"),
 *          UI.ShowWhen(bind("expanded"), UI.Column(...content)),
 *        ),
 *     {
 *       expand(expanded = true) {
 *         this.initializer.set("expanded", expanded);
 *       },
 *     },
 *   );
 * }
 */
export class CustomView extends View {
	static {
		// Enable bindings for all instances, using bind(...) without a type parameter
		CustomView.enableBindings();
	}

	/**
	 * The encapsulated view object, an attached view
	 * - Initially, this property is undefined. The view body is only created (using {@link createViewBody()}) when the CustomView instance is first rendered.
	 * - Alternatively, you can set it yourself, e.g. in the constructor. In this case, ensure that the object is a {@link View} instance that's attached directly to this view (for event handling and bindings), delegating events using {@link delegate()}.
	 */
	protected body?: View;

	/**
	 * Creates the encapsulated view object, may be overridden
	 *
	 * This method is called automatically when rendering a custom view. The result is attached to the instance, and assigned to {@link CustomView.body}.
	 *
	 * @note When using the builder pattern with {@link CustomView.builder}, this method is automatically implemented to return an instance of the content view.
	 */
	protected createViewBody(): View | undefined | void {
		// Nothing here...
	}

	/**
	 * Searches the view hierarchy for view objects of the provided type
	 * @summary This method looks for matching view objects in the current view structure — including the view itself. If a view object is an instance of the provided class, it's added to the list. Objects _within_ matching views aren't searched for further matches.
	 * @param type A view class
	 * @returns An array with instances of the provided view class; may be empty but never undefined.
	 */
	findViewContent<T extends View>(type: new (...args: any[]) => T): T[] {
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
	protected beforeRender() {
		this.emit(
			new ObservableEvent(
				"BeforeRender",
				this,
				undefined,
				undefined,
				undefined,
				true,
			),
		);
	}

	/**
	 * Creates and renders the encapsulated view body, if any
	 * - This method is called automatically whenever required. It's not necessary to invoke this method from an application.
	 * - This method may be overridden to render custom platform-dependent content.
	 */
	render(callback: RenderContext.RenderCallback) {
		if (!this.body) {
			let body = this.createViewBody();
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
		if (this.body && ObservableObject.whence(this.body) !== this) {
			throw err(ERROR.View_NotAttached);
		}
		if (!this._rendered) {
			this._rendered = true;
			this.beforeRender();
		}
		this.body?.render(callback);
	}

	private _rendered = false;
}

export namespace CustomView {
	/** The initializer for a custom view class, with a method to set the view body */
	export class Initializer<
		TView extends CustomView,
	> extends ViewBuilder.Initializer<TView> {
		/**
		 * Uses the provided view builder to set the view body for each instance
		 * - This method overrides the {@link CustomView.createViewBody} method.
		 * - The view body is only created when the view is rendered.
		 */
		setViewBody(viewBuilder: ViewBuilder) {
			this.finalize((view) => {
				(view as any).createViewBody = () => {
					return viewBuilder?.create();
				};
			});
		}
	}

	/** A custom view builder object */
	export type CustomViewBuilder<
		TView extends CustomView,
		M extends { [name: string]: (...args: any[]) => any },
	> = ViewBuilder<TView> & {
		[K in keyof M]: (...args: Parameters<M[K]>) => CustomViewBuilder<TView, M>;
	} & {
		/**
		 * Configures event interception to emit an aliased event
		 * @param origEvent The original event name to intercept
		 * @param emit The new event name to emit, or a function to call
		 * @param data The data properties to add to the alias event, if any
		 * @param forward Whether to forward the original event as well (defaults to false)
		 * @returns The builder instance for chaining
		 */
		intercept(
			origEvent: string,
			emit: string | ObservableObject.InterceptHandler<CustomView>,
			data?: Record<string, unknown>,
			forward?: boolean,
		): CustomView.CustomViewBuilder<TView, M>;
	};

	/**
	 * A type definition for custom view builder methods
	 * @see {@link CustomView.builder}
	 */
	export type CustomViewBuilderMethods<TView extends CustomView> = Record<
		string,
		(
			this: ViewBuilder<TView> & {
				initializer: CustomView.Initializer<TView>;
			},
			...args: any[]
		) => void
	>;

	/**
	 * Creates a builder for this custom view class
	 * @note For documentation and examples, see the {@link CustomView} class.
	 * @param lazyInit An optional function that may return a view builder for the encapsulated view body. The function is called lazily, only when the first instance of the custom view is created.
	 * @param extend An optional object containing builder method implementations. Each method receives its listed arguments, and does *not* need to return the 'this' value.
	 * @returns A builder object for this custom view class
	 */
	export function builder<
		T,
		TView extends CustomView & T = CustomView & T,
		M extends CustomViewBuilderMethods<TView> = CustomViewBuilderMethods<TView>,
	>(
		this: new () => TView,
		lazyInit?: (
			initializer: CustomView.Initializer<TView>,
		) => ViewBuilder | void,
		extend?: M,
	): CustomView.CustomViewBuilder<
		TView,
		{ [K in keyof M]: (...args: Parameters<M[K]>) => any }
	> {
		let initializer = new CustomView.Initializer(this);
		let result = {
			initializer,
			create() {
				if (lazyInit) {
					let body = lazyInit(initializer);
					if (body) initializer.setViewBody(body);
					lazyInit = undefined;
				}
				return initializer.create();
			},
			intercept(origEvent, emit, data, forward) {
				initializer.intercept(origEvent, emit, data, forward);
				return result;
			},
		} as CustomView.CustomViewBuilder<TView, {}>;
		if (extend) {
			for (let n in extend) {
				let m = extend[n]!;
				(result as any)[n] = function () {
					m.apply(this, arguments as any);
					return this;
				};
			}
		}
		return result as any;
	}
}
