import * as core from "talla";
import { WebContextOptions, useWebContext } from "./WebContext.js";
import { WebTheme } from "./style/WebTheme.js";
import { WebHashNavigationContext } from "./WebHashNavigationContext.js";
import { WebHistoryNavigationContext } from "./WebHistoryNavigationContext.js";
export {
	useWebContext,
	WebContextOptions,
	WebTheme,
	WebHashNavigationContext,
	WebHistoryNavigationContext,
};

if (!window.require) {
	(window as any).require = function (s: string) {
		if (s === "talla" || s === "talla" || s === "@talla-ui/web-handler") {
			return {
				...core,
				useWebContext,
				WebContextOptions,
				WebTheme,
				WebHashNavigationContext,
				WebHistoryNavigationContext,
			};
		}
		throw Error("Invalid require() call");
	};
}
