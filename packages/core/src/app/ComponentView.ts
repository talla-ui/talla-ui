import { ERROR, err } from "../errors.js";
import {
	BindingOrValue,
	ObservableEvent,
	ObservableObject,
} from "../object/index.js";
import { FormState } from "./FormState.js";
import { RenderContext } from "./RenderContext.js";
import { View } from "./View.js";

/**
 * A base class that represents a view which controls an attached body view
 *
 * @description
 * Component views are view objects that may include their own state (properties) and event handlers, to render their own view body content.
 *
 * To be able to use component views in the view hierarchy, you should also export a builder function that uses {@link ComponentViewBuilder} to create a builder object.
 *
 * For views that require a custom renderer (e.g. a platform-dependent graphic), define a view class that extends {@link ComponentView}, and overrides the {@link ComponentView.render} method altogether.
 *
 * @note Component views are very similar to {@link Activity} objects, but they don't have an active/inactive lifecycle and typically don't include any application logic (especially not for loading or saving data).
 *
 * @example
 * // Define a component view class to store view state
 * export class CollapsibleView extends ComponentView {
 *   expanded = false;
 *   onToggle() {
 *     this.expanded = !this.expanded;
 *   }
 * }
 *
 * // Export a builder function that uses the class
 * export function Collapsible(title: StringConvertible, ...content: ViewBuilder[]) {
 *   return {
 *     ...ComponentViewBuilder(CollapsibleView, (v) =>
 *        UI.Column(
 *          UI.Label(title)
 *            .icon(v.bind("expanded").then("chevronDown", "chevronNext"))
 *            .cursor("pointer")
 *            .onClick("Toggle"),
 *          UI.ShowWhen(v.bind("expanded"), UI.Column(...content)),
 *        ),
 *     ),
 *     expand(expanded = true) {
 *       this.initializer.set("expanded", expanded);
 *       return this;
 *     },
 *   };
 * }
 */
export class ComponentView extends View {
	/**
	 * The encapsulated view object, an attached view
	 * - By default, this getter property always returns `undefined`. When using {@link ComponentViewBuilder}, this property is overridden to expose a view object created from the provided view builder.
	 * - Alternatively, you can implement this property using a getter that returns a View. Typically, the view is created using a view builder which is cached for all instances of the component view.
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
	 * Adds a two-way binding between a property and a form state field.
	 * @param formState A form state object, or a binding to one (e.g. on an activity).
	 * @param formField The name of the form field to which the text field value should be bound.
	 * @param property The component view property to bind to.
	 * @param formChanged A function that will be called when the form state is updated, which should return the value to be set on the component view property; if not provided, the value will be set directly.
	 */
	protected bindFormState(
		formState: BindingOrValue<FormState | undefined>,
		formField: string,
		property: string & keyof this,
		formChanged?: (formState: FormState) => unknown,
	) {
		let current: FormState | undefined;
		this.observe(formState as any, (formState) => {
			current = formState;
			if (formState) {
				(this as any)[property] = formChanged
					? formChanged(formState)
					: formState.values[formField];
			}
		});
		this.observe(property, (value) => {
			current?.set(formField, value);
		});
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
			new ObservableEvent("BeforeRender", this, undefined, undefined, true),
		);
	}

	/**
	 * Creates and renders the encapsulated view body, if any
	 * - This method is called automatically whenever required. It's not necessary to invoke this method from an application.
	 * - This method may be overridden to render custom platform-dependent content.
	 */
	render(callback: RenderContext.RenderCallback) {
		let view = this.body;
		if (!view || !(view instanceof View)) throw err(ERROR.View_Invalid);

		// attach view body if needed
		let origin = ObservableObject.whence(view);
		if (!origin) this.attach(view, { delegate: this });
		else if (origin !== this) throw err(ERROR.View_NotAttached);

		// invoke beforeRender if needed and render body
		if (!this._rendered) this.beforeRender();
		this._rendered = view;
		view.render(callback);
	}

	private _rendered?: View;
}
