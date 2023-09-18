import { ManagedObject } from "../base/index.js";

/**
 * Interface definition for an object that contains information about the user's viewport, e.g. browser window
 *
 * @description
 * A ViewportContext object is available on the global application context, as {@link GlobalContext.viewport app.viewport}. This instance can be used to customize the UI for different viewport sizes — either directly or through a binding.
 *
 * @online_docs Refer to the Desk website for more information on responsive design and the viewport context.
 *
 * @example
 * // Determine the viewport size directly:
 * if (app.viewport.portrait) {
 *   // ...do something specific here
 * }
 *
 * @example
 * // Bind to viewport properties from a JSX view:
 * <conditional state={bound("viewport.wide")}>
 *   // ...view for wide viewports
 * </conditional>
 */
export interface ViewportContext extends ManagedObject {
	/** The viewport width in logical pixel units */
	width?: number;

	/** The viewport height in logical pixel units */
	height?: number;

	/** True if the viewport is taller than it is wide */
	portrait: boolean;

	/** True if the viewport width is below the first breakpoint */
	narrow: boolean;

	/** True if the viewport width exceeds the second breakpoint */
	wide: boolean;

	/** True if the viewport height is below the first breakpoint */
	short: boolean;

	/** True if the viewport height exceeds the second breakpoint */
	tall: boolean;

	/**
	 * Updates breakpoints for narrow, wide, short and tall properties
	 * - Breakpoints are set, and other properties are updated immediately.
	 * @param small The first breakpoint (narrow/short and below), in logical pixels
	 * @param large The second breakpoint (wide/tall and above), in logical pixels
	 */
	setBreakpoints(small: number, large: number): void;
}
