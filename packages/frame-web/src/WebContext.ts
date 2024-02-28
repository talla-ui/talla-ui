import {
	ActivityContext,
	app,
	bound,
	ConfigOptions,
	GlobalContext,
	ui,
	UIColor,
	UIComponent,
} from "@desk-framework/frame-core";
import { WebHashNavigationPath } from "./path/WebHashNavigationPath.js";
import { WebHistoryNavigationPath } from "./path/WebHistoryNavigationPath.js";
import { WebRenderer } from "./renderer/WebRenderer.js";
import { WebViewportContext } from "./renderer/WebViewportContext.js";
import { Dialog, DialogStyles } from "./style/Dialog.js";
import { MessageDialog, MessageDialogStyles } from "./style/MessageDialog.js";
import { ModalMenu, ModalMenuStyles } from "./style/ModalMenu.js";
import { WebTheme } from "./style/WebTheme.js";

/**
 * Type definition for the global {@link app} context with web-specific render and activity contexts, set by the {@link useWebContext} function
 */
export type WebContext = GlobalContext & {
	theme: WebTheme;
	activities: ActivityContext & {
		navigationPath: WebHashNavigationPath | WebHistoryNavigationPath;
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
	 * Page background color (or CSS value), defaults to Background color
	 * - Use a (custom) theme color rather than a specific color to allow the color to change with the theme. The page background is updated dynamically when the theme changes.
	 */
	pageBackground: UIColor | string = ui.color.BACKGROUND;

	/**
	 * Modal shade backdrop color (or CSS value), defaults to darkened Text color at low opacity
	 * - Use a (custom) theme color rather than a specific color to allow the color to change with the theme. The modal shade color is updated dynamically when the theme changes.
	 */
	modalShadeBackground: UIColor | string =
		ui.color.TEXT.brighten(-0.8).alpha(0.3);

	/**
	 * Options for the appearance of the default modal dialog view (container)
	 * - These styles can be changed directly on this object. Refer to {@link DialogStyles} for details.
	 * @see {@link DialogStyles}
	 */
	dialogStyles: DialogStyles = Dialog.styles;

	/**
	 * Options for the appearance of the default modal message dialog view
	 * - These styles can be changed directly on this object. Refer to {@link MessageDialogStyles} for details.
	 * @see {@link MessageDialogStyles}
	 */
	messageDialogStyles: MessageDialogStyles = MessageDialog.styles;

	/**
	 * Options for the appearance of the default modal menu view
	 * - These styles can be changed directly on this object. Refer to {@link ModalMenuStyles} for details.
	 * @see {@link ModalMenuStyles}
	 */
	modalMenuStyles: ModalMenuStyles = ModalMenu.styles;

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
 *       decoration: { borderColor: ui.color.PRIMARY },
 *     });
 * });
 * app.addActivity(new MyActivity())
 * app.addService("MyService", new MyService())
 */
export function useWebContext(config?: ConfigOptions.Arg<WebContextOptions>) {
	let options = WebContextOptions.init(config);

	// clear the current app properties first
	app.clear();

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

	// create DOM renderer
	let renderer = (app.renderer = new WebRenderer(options));
	bound("theme").bindTo(renderer, () => {
		WebTheme.initializeCSS(options);
		Promise.resolve().then(() => renderer.remount());
	});

	// create navigation path
	if (options.useHistoryAPI) {
		app.activities.navigationPath = new WebHistoryNavigationPath(options);
	} else {
		app.activities.navigationPath = new WebHashNavigationPath(options);
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
