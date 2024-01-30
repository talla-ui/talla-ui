export * from "@desk-framework/frame-core";
import * as desk from "@desk-framework/frame-core";
import { WebContextOptions, useWebContext } from "./WebContext.js";
import { WebTheme } from "./style/WebTheme.js";
import { WebHashNavigationPath } from "./path/WebHashNavigationPath.js";
import { WebHistoryNavigationPath } from "./path/WebHistoryNavigationPath.js";
export {
	useWebContext,
	WebContextOptions,
	WebTheme,
	WebHashNavigationPath,
	WebHistoryNavigationPath,
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
				WebHashNavigationPath,
				WebHistoryNavigationPath,
			};
		}
		throw Error("Invalid require() call");
	};
}
