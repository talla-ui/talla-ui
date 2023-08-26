import { ActivationContext, app, GlobalContext, UIStyle } from "desk-frame";
import { WebTheme } from "./style/WebTheme.js";
import { WebRenderer } from "./renderer/WebRenderer.js";
import { WebViewportContext } from "./renderer/WebViewportContext.js";
import { WebHashActivationPath } from "./path/WebHashActivationPath.js";
import { WebHistoryActivationPath } from "./path/WebHistoryActivationPath.js";

/**
 * Type definition for the global {@link app} context with web-specific render and activation contexts, set by the {@link useWebContext} function
 */
export type WebContext = GlobalContext & {
	theme: WebTheme;
	activities: ActivationContext & {
		activationPath: WebHashActivationPath | WebHistoryActivationPath;
	};
};

/**
 * A class that contains options for the web context
 * - These options should be set in a configuration callback passed to {@link useWebContext}.
 */
export class WebContextOptions {
	/** The application base path */
	basePath = "";

	/** True if the DOM history API should be used, rather than location hashes */
	useHistoryAPI = false;

	/** A {@link WebTheme} instance that will be set as the active theme */
	theme = new WebTheme();

	/** A list of URLs for CSS files to import */
	importCSS: string[] = [];

	/** Control text styles, defaults to system font at 14 logical pixels if not set */
	controlTextStyle?: UIStyle.Definition.TextStyle;

	/** Custom focus (outline) decoration styles, if any */
	focusDecoration?: UIStyle.Definition.Decoration;

	/** True if all anumations should be disabled */
	reducedMotion = false;

	/** Relative scale of logical pixels, defaults to 1 */
	logicalPxScale = 1;

	/** Time (in ms) between frame renders if animation frame doesn't trigger */
	missedFrameTime = 30;

	/** Breakpoint (in logical pixels) below which {@link ViewportContext.narrow} and {@link ViewportContext.short} are set */
	smallBreakpoint = 590;

	/** Breakpoint (in logical pixels) above which {@link ViewportContext.wide} and {@link ViewportContext.tall} are set */
	largeBreakpoint = 1150;
}

/**
 * Clears the current global {@link app} context and initializes a web context
 * - This method must be used to set up a Desk web application. It can also be used to clear the state of the current application, e.g. after logging out the current user or applying global settings.
 * - Before initializing a new context, the {@link GlobalContext.clear()} method is used to reset the current context, if any.
 *
 * @param configure A callback function that sets options on a provided {@link WebContextOptions} object
 * @returns The {@link app} global context, typed as {@link WebContext}.
 *
 * @example
 * // Start the application
 * const app = useWebContext((options) => {
 *   options.logicalPxScale = 1.5;
 *   options.theme.styles.LinkButton =
 *     options.theme.styles.LinkButton.extend({
 *       decoration: { borderColor: UIColor.Primary },
 *     });
 * });
 * app.addActivity(new MyActivity())
 * app.addService("MyService", new MyService())
 */
export function useWebContext(
	configure?: (options: WebContextOptions) => void
) {
	let options = new WebContextOptions();
	configure && configure(options);

	// clear the current app properties first
	app.clear();

	// create DOM renderer
	let renderer = (app.renderer = new WebRenderer(options));

	// on (change) event, reset all CSS styles
	renderer.listen((e) => {
		if (e.source === renderer) {
			WebTheme.initializeCSS(options);
		}
	});

	// apply theme
	WebTheme.initializeCSS(options);
	app.theme = options.theme;

	// create viewport context and update
	let viewport = new WebViewportContext(options);
	app.viewport = viewport;
	viewport.update();

	// create activation path
	if (options.useHistoryAPI) {
		app.activities.activationPath = new WebHistoryActivationPath(options);
	} else {
		app.activities.activationPath = new WebHashActivationPath(options);
	}

	// enable hot module reload for activities
	// handle is either module, module.hot, or import.meta.hot
	app.hotReload = function (handle, ActivityClass) {
		if (handle && handle.hot) handle = handle.hot;
		if (
			handle &&
			typeof handle.accept === "function" &&
			typeof handle.dispose === "function"
		) {
			handle.accept();
			(ActivityClass as any)._$hotReload(handle.data?.activity, ActivityClass);
			handle.dispose((data: any) => {
				data.activity = ActivityClass;
			});
		}
	};

	// return a typed reference
	return app as WebContext;
}
