import { ManagedObject } from "../base/index.js";

/**
 * Interface definition for an object that contains information about the user's viewport, e.g. browser window
 *
 * @description
 * A ViewportContext object is available on the global application context, as {@link GlobalContext.viewport app.viewport}. This instance can be used to customize the UI for different viewport sizes — either directly or through a binding.
 *
 * Bindings for viewport context properties can also be created using the {@link $viewport} object.
 *
 * @online_docs Refer to the Desk website for more information on responsive design and the viewport context.
 * @docgen {hideconstructor}
 *
 * @example
 * // Determine the viewport size directly:
 * if (app.viewport.portrait) {
 *   // ...do something specific here
 * }
 *
 * @example
 * // Bind to viewport properties from a JSX view:
 * <conditional state={$viewport.bind("col3")}>
 *   // ...view for wide viewports with at least 3 grid 'columns'
 * </conditional>
 */
export interface ViewportContext extends ManagedObject {
	/** The viewport width in logical pixel units */
	width?: number;

	/** The viewport height in logical pixel units */
	height?: number;

	/** True if the viewport is taller than it is wide */
	portrait: boolean;

	/** True if the viewport is at least 2 grid columns wide */
	col2: boolean;

	/** True if the viewport is at least 3 grid columns wide */
	col3: boolean;

	/** True if the viewport is at least 4 grid columns wide */
	col4: boolean;

	/** True if the viewport is at least 5 grid columns wide */
	col5: boolean;

	/** True if the viewport is at least 2 grid columns tall */
	row2: boolean;

	/** True if the viewport is at least 3 grid columns tall */
	row3: boolean;

	/** True if the viewport is at least 4 grid columns tall */
	row4: boolean;

	/** True if the viewport is at least 5 grid columns tall */
	row5: boolean;

	/**
	 * Sets grid size to determine number of rows and columns
	 * - Other properties are updated immediately when this method is called.
	 * @param colSize Column size, in logical pixels
	 * @param rowSize Row size, in logical pixels
	 */
	setGridSize(colSize: number, rowSize: number): void;
}
