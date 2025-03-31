import type { ConfigOptions } from "@talla-ui/util";
import { RenderContext, View, ViewBuilder } from "../../app/index.js";
import {
	Binding,
	BindingOrValue,
	ObservedEvent,
	ObservedObject,
} from "../../object/index.js";
import { ERROR, err } from "../../errors.js";
import { ui } from "../ui_interface.js";

/** Label property used to filter bindings using $view */
const $_bind_label = Symbol("view");

/** An object that can be used to create bindings for properties of the containing {@link UIComponent} object */
export const $view = Binding.createFactory($_bind_label);

/**
 * A class that encapsulates a dynamic view
 *
 * @description
 * UI components are view objects that encapsulate a single (attached) view object. When rendered, UI components display the contained body view object.
 *
 * The encapsulated view is referenced by the {@link UIComponent.body body} property, which is usually set automatically, either when the UIComponent is instantiated or right before rendering. It may be changed or unlinked at any time; the rendered view will be updated accordingly by the UIComponent itself.
 *
 * Since the view is attached to the UIComponent object, bindings continue to work, and events can be handled either by the UIComponent object or by a containing object.
 *
 * UI components are primarily used in two different ways:
 *
 * - As a way to _control_ an encapsulated view, e.g. to set properties dynamically, or to handle events.
 * - As a way to create reusable view structures. Refer to the static {@link define()} method which can be used to create a UIComponent class using a function and/or a class.
 */
export class UIComponent extends View {
	/**
	 * Creates a reusable UI component class
	 *
	 * @summary This method can be used to define a reusable custom UI component, with specified properties and view body. The resulting class can be used as part of a view structure, either using the {@link ui.use()} function or using a JSX tag.
	 *
	 * @param defaults A set of default property values to be applied to each instance of the custom UI component.
	 * @param defineView A {@link ViewBuilder} object, or a function that returns a view builder; the view builder is used to create the view content for each instance of the component.
	 * @param intercept An optional function that is called for each instance of the component, with the instance as argument. The function should return an object with event names as keys, and event intercept functions as values.
	 * @returns A new class that extends `UIComponent`, with a constructor that takes a single preset object argument with a type that matches the provided defaults object.
	 *
	 * @description
	 * This method creates a new class that extends {@link UIComponent}, which encapsulates and renders a contained view. The constructor of the resulting class takes a single object argument, a preset object, which is applied to the instance at first — setting properties, applying bindings, and adding event aliases.
	 *
	 * The resulting class can be used as a JSX tag on its own, with attributes corresponding to the properties of the (default) preset object, or it can be used with the {@link ui.use()} function. In both cases, the result is a {@link ViewBuilder} object.
	 *
	 * @note Note that while _UI components_ and _activities_ are very similar, as a rule, UI components should not include any business logic (in event handlers or other methods). Hence, use this function only to define groups of UI elements and determine their look and feel. Where more code is required, consider either activities, or view models that can be passed around in your code.
	 */
	static define<
		TDefaults extends {},
		TPreset extends {} = {
			[p in keyof TDefaults]?: TDefaults[p] extends ConfigOptions
				? ConfigOptions.Arg<TDefaults[p]>
				: BindingOrValue<TDefaults[p]>;
		},
	>(
		defaults: TDefaults,
		defineView?:
			| ViewBuilder
			| ((
					view: UIComponent & TDefaults,
					...content: ViewBuilder[]
			  ) => ViewBuilder),
		intercept?: (view: UIComponent & TDefaults) => {
			[k: string]: (
				event: ObservedEvent,
				emit: (event: ObservedEvent) => void,
			) => void;
		},
	): UIComponent.DefinedUIComponent<TPreset, TDefaults> {
		return class DefinedUIComponent extends UIComponent {
			constructor(p?: TPreset) {
				super();
				ViewBuilder.applyPreset(this, { ...defaults, ...p });
				let events = intercept?.(this as any);
				for (let k in events) {
					ObservedObject.intercept(this, k, events[k]!);
				}
			}
			protected override defineView(...content: ViewBuilder[]) {
				return typeof defineView === "function"
					? defineView(this as any, ...content)
					: defineView;
			}
		} as any;
	}

	/**
	 * Creates a new {@link ViewBuilder} instance for the current view class
	 * @see {@link View.getViewBuilder}
	 * @docgen {hide}
	 */
	static override getViewBuilder(
		this: new () => UIComponent,
		preset: any,
		...content: ViewBuilder[]
	) {
		let bodyBuilder: ViewBuilder | undefined | void;
		let b = super.getViewBuilder(preset) as ViewBuilder<UIComponent>;
		return b.addInitializer((view) => {
			let _defineView = view.defineView;
			view.defineView = () =>
				(bodyBuilder ||= _defineView.apply(view, content));
		});
	}

	/**
	 * The encapsulated view object, an attached view
	 * - Initially, this property is undefined. The view object is only created (using {@link UIComponent.createView createView()}) when the UIComponent instance is first rendered.
	 * - Alternatively, you can set it yourself, e.g. in the constructor. In this case, ensure that the object is a {@link View} instance that's attached directly to this component, and events are delegated using {@link UIComponent.delegate()}.
	 */
	body?: View;

	/** @internal */
	[$_bind_label] = true;

	/**
	 * Creates a view builder for the `body` content of this UI component, can be overridden
	 * @summary This method is called by default from {@link createView()} to create the {@link body} view object when rendering this UI component. On components created from a view builder, this method is called only once and its result is reused for each instance created from the builder.
	 * @param content View builders for further content that should be included in the component, if any
	 * @returns A {@link ViewBuilder} that will be used to create the view body
	 */
	protected defineView(...content: ViewBuilder[]): ViewBuilder | void {}

	/**
	 * Creates the encapsulated view object, using the result from {@link defineView()}
	 *
	 * This method is called automatically when rendering a UI component. The result is attached to the instance, and assigned to {@link UIComponent.body}. If the view is unlinked, the {@link UIComponent.body} property is set to undefined again.
	 *
	 * By default, this method uses {@link defineView()} to obtain a view builder. Subclasses should either override {@link defineView}, override {@link createView}, or set the {@link UIComponent.body} property directly.
	 */
	protected createView(): View | undefined | void {
		return this.defineView()?.create();
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
	 * - This method is called automatically when an event is emitted by the current view object (except if {@link ObservedEvent.noPropagation} was set on the event; see {@link ObservedObject.attach()} which is used to set up view event delegation).
	 * - The base implementation calls activity methods starting with `on`, e.g. `onClick` for a `Click` event. The event is passed as a single argument, and the return value should either be `true` (event handled), false/undefined, or a promise (which is awaited just to be able to handle any errors).
	 * @param event The event to be delegated
	 * @returns The result of the event handler method, or undefined.
	 * @see {@link ObservedObject.attach}
	 * @see {@link ObservedObject.EventDelegate}
	 */
	delegate(event: ObservedEvent): Promise<boolean | void> | boolean | void {
		return (this as any)["on" + event.name]?.(event);
	}

	/**
	 * A method that's called before the view is rendered, to be overridden if needed
	 * - The default implementation emits a `BeforeRender` event. The event is never propagated because of the {@link ObservedEvent.noPropagation} flag.
	 */
	protected beforeRender() {
		this.emit(
			new ObservedEvent(
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
		if (this.body && ObservedObject.whence(this.body) !== this) {
			throw err(ERROR.View_NotAttached);
		}
		if (!this._rendered) {
			this._rendered = true;
			this.beforeRender();
		}
		this.body?.render(callback);
		return this;
	}

	private _rendered = false;
}

export namespace UIComponent {
	/** Type definition for the result of {@link UIComponent.define()}, describes a generated UI component constructor */
	export interface DefinedUIComponent<
		TPreset extends {},
		TDefaults extends {},
	> {
		getViewBuilder(
			preset?: PresetWithEvents<TPreset>,
			...content: ViewBuilder[]
		): ViewBuilder<UIComponent & TDefaults>;
		whence: typeof ObservedObject.whence;
		new (preset?: PresetWithEvents<TPreset>): UIComponent & TDefaults;
	}

	export type PresetWithEvents<T extends {}> = T & {
		[k in `on${Capitalize<string>}`]?: string;
	};
}
