import * as core from "@talla-ui/core";
import { setWebTheme, useWebContext } from "./setup.js";
import { WebContextOptions } from "./WebContextOptions.js";
import { WebModalComponents } from "./WebModalFactory.js";
import { WebNavigationContext } from "./WebNavigationContext.js";
import { WebRenderer } from "./WebRenderer.js";
import { WebTheme } from "./WebTheme.js";
export {
	setWebTheme,
	useWebContext,
	WebContextOptions,
	WebModalComponents,
	WebNavigationContext,
	WebRenderer,
	WebTheme,
};

// Re-export app from core for convenience
export { app } from "@talla-ui/core";

if (!window.require) {
	(window as any).require = function (s: string) {
		if (
			s === "talla-ui" ||
			s === "@talla-ui/core" ||
			s === "@talla-ui/web-handler"
		) {
			return {
				...core,
				useWebContext,
				setWebTheme,
				WebContextOptions,
				WebNavigationContext,
				WebRenderer,
				WebTheme,
			};
		}
		throw Error("Invalid require() call");
	};
}
