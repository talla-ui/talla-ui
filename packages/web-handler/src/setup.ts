import {
	app,
	AppContext,
	UIAnimation,
	UIColor,
	UIIconResource,
	UIStyle,
} from "@talla-ui/core";
import { ConfigOptions } from "@talla-ui/util";
import defaultAnimations from "./defaults/animations.js";
import defaultColors from "./defaults/colors.js";
import defaultIcons from "./defaults/icons.js";
import defaultStyles from "./defaults/styles.js";
import { initializeCSS } from "./DOMStyle.js";
import { WebContextOptions } from "./WebContextOptions.js";
import { WebLocalData } from "./WebLocalData.js";
import { WebNavigationContext } from "./WebNavigationContext.js";
import { WebRenderer } from "./WebRenderer.js";
import { WebViewport } from "./WebViewport.js";

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
 *   // ... more options
 * });
 * app.addActivity(new MyActivity());
 */
export function useWebContext(config?: ConfigOptions.Arg<WebContextOptions>) {
	let options = WebContextOptions.init(config);

	// clear the current app properties first
	app.clear();

	// initialize local data
	app.localData = new WebLocalData(options);

	// create DOM renderer and viewport
	let renderer = new WebRenderer(options);
	app.renderer = renderer;
	let viewport = new WebViewport(options);
	app.viewport = viewport;

	// fix string colors if needed
	function mapColors(colors?: Record<string, any>) {
		if (!colors) return undefined;
		let result: Record<string, any> = {};
		for (let key in colors) {
			result[key] =
				colors[key] instanceof UIColor ? colors[key] : new UIColor(colors[key]);
		}
		return result;
	}
	let colors = mapColors(options.colors);
	let darkColors = mapColors(options.darkColors);

	// initialize theme and global CSS styles (also on remount)
	UIColor.theme.set({
		...defaultColors,
		...colors,
	});
	UIIconResource.theme.set({
		...defaultIcons,
		...options.icons,
	});
	UIAnimation.theme.set({
		...defaultAnimations,
		...options.animations,
	});
	UIStyle.theme.button.set({
		...defaultStyles.button,
		...options.buttonStyles,
	});
	UIStyle.theme.label.set({
		...defaultStyles.label,
		...options.labelStyles,
	});
	UIStyle.theme.image.set({
		...defaultStyles.image,
		...options.imageStyles,
	});
	UIStyle.theme.textfield.set({
		...defaultStyles.textfield,
		...options.textfieldStyles,
	});
	UIStyle.theme.toggle.set({
		...defaultStyles.toggle,
		...options.toggleStyles,
	});
	UIStyle.theme.divider.set({
		...defaultStyles.divider,
		...options.dividerStyles,
	});
	initializeCSS(options);
	renderer.listen((e) => {
		if (e.name === "Remount") initializeCSS(options);
	});

	// apply dark color scheme automatically, if any
	if (options.darkColors) {
		viewport.listen((e) => {
			if (e.name === "ColorScheme") {
				UIColor.theme.set({
					...defaultColors,
					...colors,
					...(viewport.prefersDark ? darkColors : undefined),
				});
				app.remount();
			}
		});
		if (viewport.prefersDark) {
			UIColor.theme.set({
				...defaultColors,
				...darkColors,
			});
		}
	}

	// create navigation context
	app.navigation?.unlink();
	app.navigation = new WebNavigationContext(options);

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

	// return a reference to the app context
	return app;
}
