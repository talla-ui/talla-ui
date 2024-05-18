export * from "@desk-framework/frame-core";
import * as desk from "@desk-framework/frame-core";
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
		if (
			s === "@desk-framework/frame-core" ||
			s === "@desk-framework/frame-web"
		) {
			return {
				...desk,
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
