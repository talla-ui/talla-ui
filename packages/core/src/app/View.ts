import { ObservableEvent, ObservableObject } from "../object/index.js";
import type { RenderContext } from "./RenderContext.js";

/** Type definition for an event that's emitted on a view object */
export type ViewEvent<
	TSource extends View = View,
	TData extends Record<string, unknown> = Record<string, unknown>,
> = ObservableEvent<TSource, TData>;

/**
 * An abstract class that represents a view
 *
 * @description
 * The view is one of the main architectural components of an application. It provides a method to render its encapsulated content, either directly or using a collection of built-in UI elements.
 *
 * Views can be rendered on their own (using {@link AppContext.render app.render()}) or included as content within another view. In most cases, a top-level view is created from the {@link Activity.createView()} method.
 *
 * The View class can't be used on its own. Instead, define views using functions that return view _builders_, e.g. `UI.Column()`, `UI.Button()`, and `UI.ShowWhen()`; or define a custom view for reusable content, using the {@link CustomView} class.
 *
 * @see {@link UIViewElement}
 * @see {@link CustomView}
 *
 * @docgen {hideconstructor}
 */
export abstract class View extends ObservableObject {
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
