import {
	app,
	ConfigOptions,
	AppContext,
	ui,
	UIColor,
	UIComponent,
} from "@talla-ui/core";
import { WebHashNavigationContext } from "./WebHashNavigationContext.js";
import { WebHistoryNavigationContext } from "./WebHistoryNavigationContext.js";
import { WebRenderer } from "./renderer/WebRenderer.js";
import { Dialog, WebDialogStyles } from "./style/Dialog.js";
import {
	MessageDialog,
	WebMessageDialogStyles,
} from "./style/MessageDialog.js";
import { ModalMenu, WebModalMenuStyles } from "./style/ModalMenu.js";
import { WebTheme } from "./style/WebTheme.js";
import { WebLocalData } from "./WebLocalData.js";

/**
 * A class that contains options for the web handler instance
 * - These options should be set in a configuration callback passed to {@link useWebContext}.
 */
export class WebContextOptions extends ConfigOptions {
	/** The application base path */
	basePath = "";

	/** True if the DOM history API should be used, rather than location hashes */
	useHistoryAPI = false;

	/**
	 * True if root and/or page entries should be inserted into DOM history when browsing to a page or detail path directly
	 * - Setting this option to true or `page` will allow users to navigate back to the page even if they opened a detail path in a new tab or from a bookmark.
	 * - Setting this option to `root` also inserts a root path (i.e. page `""`) into the history.
	 */
	insertHistory: boolean | "root" | "page" = false;

	/**
	 * Initial data saved to `app.localData`
	 * - Each of the properties of this object gets persisted to `localStorage`, **only** if no data has been written for the corresponding key yet (or it has been cleared).
	 * - Data must be serializable as JSON, and readable by {@link ObjectReader}.
	 */
	defaultLocalData: Record<string, Record<string, unknown>> = {};

	/**
	 * Key prefix to be used when storing and retrieving `app.localData` objects from `localStorage`
	 * - This property defaults to `LocalData_`, and may be modified if multiple applications run on the same page that may be using conflicting data keys.
	 */
	localDataPrefix = "LocalData_";

	/** A {@link WebTheme} instance that will be set as the active theme */
	theme = new WebTheme();

	/** A list of URLs for CSS files to import */
	importCSS: string[] = [];

	/** Control text styles, defaults to system font at 14 logical pixels if not set */
	controlTextStyle?: UIComponent.TextStyle;

	/** Opacity value to be used for labels with `dim` set to true */
	dimLabelOpacity = 0.5;

	/** Custom focus (outline) decoration styles, if any */
	focusDecoration?: UIComponent.Decoration;

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
	 * - These styles can be changed directly on this object. Refer to {@link WebDialogStyles} for details.
	 * @see {@link WebDialogStyles}
	 */
	dialogStyles: WebDialogStyles = Dialog.styles;

	/**
	 * Options for the appearance of the default modal message dialog view
	 * - These styles can be changed directly on this object. Refer to {@link WebMessageDialogStyles} for details.
	 * @see {@link WebMessageDialogStyles}
	 */
	messageDialogStyles: WebMessageDialogStyles = MessageDialog.styles;

	/**
	 * Options for the appearance of the default modal menu view
	 * - These styles can be changed directly on this object. Refer to {@link WebModalMenuStyles} for details.
	 * @see {@link WebModalMenuStyles}
	 */
	modalMenuStyles: WebModalMenuStyles = ModalMenu.styles;

	/** Viewport column width in pixels, defaults to 300 */
	viewportColumnWidth = 300;

	/** Viewport row height in pixels, defaults to 300 */
	viewportRowHeight = 300;

	/** True if all anumations should be disabled */
	reducedMotion = false;

	/** Relative scale of logical pixels, defaults to 1 */
	logicalPxScale = 1;

	/** Relative scale of logical pixels for narrow screens (< 600px), defaults to (16/14) to upscale 14px text to 16px */
	logicalPxScaleNarrow = 16 / 14;

	/** Time (in ms) between frame renders if animation frame doesn't trigger */
	missedFrameTime = 30;
}

/**
 * Clears the current global {@link app} context and initializes the application context for the web handler
 * - This method must be used to set up an application using the web handler. It can also be used to clear the state of the current application, e.g. after logging out the current user or applying global settings.
 * - Before initializing a new context, the {@link AppContext.clear()} method is used to reset the current context, if any.
 *
 * @param config A {@link WebContextOptions} object, or a callback function to set options
 * @returns The global {@link app} context
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
 * app.addActivity(new MyActivity());
 */
export function useWebContext(config?: ConfigOptions.Arg<WebContextOptions>) {
	let options = WebContextOptions.init(config);

	// clear the current app properties first
	app.clear();

	// initialize local data
	app.localData = new WebLocalData(options);

	// apply theme
	WebTheme.initializeCSS(options);
	app.theme = options.theme;

	// update modal styles
	ModalMenu.styles = options.modalMenuStyles;
	MessageDialog.styles = options.messageDialogStyles;

	// create DOM renderer, initialize CSS on remount
	let renderer = new WebRenderer(options);
	(app as any).renderer = renderer;
	renderer.listen((e) => {
		if (e.name === "Remount") WebTheme.initializeCSS(options);
	});

	// create navigation path
	app.navigation.unlink();
	if (options.useHistoryAPI) {
		app.navigation = new WebHistoryNavigationContext(options);
	} else {
		app.navigation = new WebHashNavigationContext(options);
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
	return app;
}
