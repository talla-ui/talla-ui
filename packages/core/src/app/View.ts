import { ObservableEvent, ObservableObject } from "../object/index.js";
import type { RenderContext } from "./RenderContext.js";

/** Type definition for an event that's emitted on a view object */
export type ViewEvent<
	TSource extends View = View,
	TData extends Record<string, unknown> = Record<string, unknown>,
> = ObservableEvent<TSource, TData>;

/** Type definition for a view event handler function or method */
export type ViewEventHandler<
	TSource extends View = View,
	TData extends Record<string, unknown> = Record<string, unknown>,
> = (event: ViewEvent<TSource, TData>) => any;

/**
 * An abstract class that represents a view
 *
 * @description
 * The view is one of the main architectural components of an application. It provides a method to render its encapsulated content, either directly or using a collection of built-in UI elements.
 *
 * Views are typically expressed using functions that return view _builders_ (i.e. 'blueprints' or templates that define a view with a particular configuration and content). Afterwards, views can be rendered on their own (using {@link AppContext.render app.render()}), included as content within another view, or used by an activity (setting its static `view` property).
 *
 * @see {@link UIElement}
 * @see {@link ComponentView}
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
