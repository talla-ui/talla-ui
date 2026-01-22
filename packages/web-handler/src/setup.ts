import { app, UIColor, UIIconResource } from "@talla-ui/core";
import { initializeCSS } from "./DOMStyle.js";
import { WebContextOptions } from "./WebContextOptions.js";
import { WebNavigationContext } from "./WebNavigationContext.js";
import { WebRenderer } from "./WebRenderer.js";
import { WebTheme, WebThemeData } from "./WebTheme.js";
import { WebViewport } from "./WebViewport.js";
import { ModalMenu } from "./modals/ModalMenu.js";
import { UITextRenderer } from "./observers/UITextRenderer.js";

/** @internal Currently active theme, for auto dark mode */
let _activeTheme: WebTheme | undefined;

/**
 * Applies a theme to the web application.
 * - Dark mode is handled automatically based on {@link Viewport.prefersDark}, if colors and/or icons are defined as part of the theme.
 * - Triggers a renderer remount to apply all new styles and re-evaluate color values.
 * - Can be called during the {@link useWebContext()} configuration callback or later at runtime.
 *
 * @param theme The theme to apply.
 *
 * @example
 * // Apply a theme with custom colors
 * setWebTheme(new WebTheme()
 *   .colors({ accent: "#FF5722" })
 *   .darkColors({ accent: "#FF7043" })
 * );
 */
export function setWebTheme(theme: WebTheme): void {
	_activeTheme = theme;
	let renderer = app.renderer as WebRenderer | undefined;
	if (!renderer) return;

	let isDark = app.viewport?.prefersDark ?? false;
	let data = theme.getThemeData(isDark) as WebThemeData;

	// apply colors and icons to global registries
	UIColor.setColors(data.colors);
	UIIconResource.setIcons(data.icons);

	// apply style default configuration
	UITextRenderer.defaultIconStyle = {
		size: data.options.iconSize,
		margin: data.options.iconMargin,
	};
	ModalMenu.menuOffset = data.options.menuOffset;

	// apply global CSS, with defaults, named styles, and URL imports
	initializeCSS(data.options, data.styles, data.imports);
	renderer.setBackgrounds(
		data.options.pageBackground,
		data.options.modalShadeBackground,
	);

	// remount to apply all changes
	app.remount();
}

/**
 * Initializes the web application context with renderer, viewport, and navigation.
 * - Clears any existing context using {@link AppContext.clear()} before initialization.
 * - Applies a default theme automatically; use {@link setWebTheme()} in the callback to customize.
 * - Sets up automatic dark mode handling when the system color scheme changes.
 * - Enables hot module reload for activities when using a compatible bundler.
 *
 * Call this function once at application startup to configure the web handler. It can also
 * be called again to reset application state, for example after logging out the current user.
 *
 * @param config A callback to configure options and apply a custom theme.
 * @returns The global {@link app} context.
 *
 * @example
 * // Start the application with default theme
 * const app = useWebContext();
 * app.addActivity(new MyActivity());
 *
 * @example
 * // Start with custom theme
 * const app = useWebContext(() => {
 *   setWebTheme(new WebTheme()
 *     .colors({ accent: "#FF5722" })
 *     .darkColors({ accent: "#FF7043" })
 *   );
 * });
 */
export function useWebContext(config?: (opts: WebContextOptions) => void) {
	let options = new WebContextOptions();

	// Clear the current app properties first
	app.clear();

	// Create DOM renderer and viewport
	let renderer = new WebRenderer(options);
	app.renderer = renderer;
	let viewport = new WebViewport(options);
	app.viewport = viewport;

	// Apply default theme first (before calling config callback)
	setWebTheme(new WebTheme());

	// Run configuration callback (which may call setWebTheme again)
	config?.(options);

	// Set up dark mode listener to re-apply theme when color scheme changes
	viewport.listen((e) => {
		if (e.name === "ColorScheme" && _activeTheme) {
			setWebTheme(_activeTheme);
		}
	});

	// Create navigation context
	app.navigation?.unlink();
	app.navigation = new WebNavigationContext(options);

	// Enable hot module reload for activities
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

	// Return a reference to the app context
	return app;
}
