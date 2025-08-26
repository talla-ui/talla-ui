/**
 * Interface definition for an object that contains information about the user's viewport, e.g. screen or browser window
 *
 * @description
 * A viewport object is available on the global application context, as {@link AppContext.viewport app.viewport}. Properties of this instance can be bound from views, to create a responsive UI.
 *
 * @online_docs Refer to the online documentation for more information on responsive design and the viewport context.
 * @docgen {hideconstructor}
 *
 * @example
 * // Determine the viewport size directly:
 * if (app.viewport?.portrait) {
 *   // ...do something specific here
 * }
 */
export interface Viewport {
	/** The viewport width in logical pixel units */
	width?: number;

	/** The viewport height in logical pixel units */
	height?: number;

	/** True if the viewport is taller than it is wide */
	portrait: boolean;

	/** The number of columns in the viewport grid */
	cols: number;

	/** The number of rows in the viewport grid */
	rows: number;

	/** True if the user's preferences indicate a dark color scheme */
	prefersDark?: boolean;
}
