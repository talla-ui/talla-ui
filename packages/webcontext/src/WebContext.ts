import {
	ActivationContext,
	app,
	ConfigOptions,
	GlobalContext,
	UIComponent,
} from "desk-frame";
import { WebHashActivationPath } from "./path/WebHashActivationPath.js";
import { WebHistoryActivationPath } from "./path/WebHistoryActivationPath.js";
import { WebRenderer } from "./renderer/WebRenderer.js";
import { WebViewportContext } from "./renderer/WebViewportContext.js";
import { MessageDialog, MessageDialogStyles } from "./style/MessageDialog.js";
import { ModalMenu, ModalMenuStyles } from "./style/ModalMenu.js";
import { WebTheme } from "./style/WebTheme.js";

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
export class WebContextOptions extends ConfigOptions {
	/** The application base path */
	basePath = "";

	/** True if the DOM history API should be used, rather than location hashes */
	useHistoryAPI = false;

	/** A {@link WebTheme} instance that will be set as the active theme */
	theme = new WebTheme();

	/** A list of URLs for CSS files to import */
	importCSS: string[] = [];

	/** Control text styles, defaults to system font at 14 logical pixels if not set */
	controlTextStyle?: UIComponent.TextStyleType;

	/** Custom focus (outline) decoration styles, if any */
	focusDecoration?: UIComponent.DecorationStyleType;

	/**
	 * Options for the appearance of the default modal menu view
	 * - These styles can be changed directly on this object. Refer to {@link ModalMenuStyles} for details.
	 * @see {@link ModalMenuStyles}
	 */
	modalMenuStyles: ModalMenuStyles = ModalMenu.styles;

	/**
	 * Options for the appearance of the default modal message dialog view
	 * - These styles can be changed directly on this object. Refer to {@link MessageDialogStyles} for details.
	 * @see {@link MessageDialogStyles}
	 */
	messageDialogStyles: MessageDialogStyles = MessageDialog.styles;

	/** Breakpoint (in logical pixels) below which {@link ViewportContext.narrow} and {@link ViewportContext.short} are set */
	smallBreakpoint = 590;

	/** Breakpoint (in logical pixels) above which {@link ViewportContext.wide} and {@link ViewportContext.tall} are set */
	largeBreakpoint = 1150;

	/** True if all anumations should be disabled */
	reducedMotion = false;

	/** Relative scale of logical pixels, defaults to 1 */
	logicalPxScale = 1;

	/** Time (in ms) between frame renders if animation frame doesn't trigger */
	missedFrameTime = 30;
}

/**
 * Clears the current global {@link app} context and initializes a web context
 * - This method must be used to set up a Desk web application. It can also be used to clear the state of the current application, e.g. after logging out the current user or applying global settings.
 * - Before initializing a new context, the {@link GlobalContext.clear()} method is used to reset the current context, if any.
 *
 * @param config A {@link WebContextOptions} object, or a callback function to set options
 * @returns The {@link app} global context, typed as {@link WebContext}.
 *
 * @example
 * // Start the application
 * const app = useWebContext((options) => {
 *   options.logicalPxScale = 1.5;
 *   options.theme.styles.LinkButton =
 *     options.theme.styles.LinkButton.extend({
 *       decoration: { borderColor: UIColor["@primary"] },
 *     });
 * });
 * app.addActivity(new MyActivity())
 * app.addService("MyService", new MyService())
 */
export function useWebContext(config?: ConfigOptions.Arg<WebContextOptions>) {
	let options = WebContextOptions.init(config);

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

	// update modal styles
	ModalMenu.styles = options.modalMenuStyles;
	MessageDialog.styles = options.messageDialogStyles;

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
