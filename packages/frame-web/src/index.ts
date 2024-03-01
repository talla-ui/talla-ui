export * from "@desk-framework/frame-core";
import * as desk from "@desk-framework/frame-core";
import { WebContextOptions, useWebContext } from "./WebContext.js";
import { WebTheme } from "./style/WebTheme.js";
import { WebHashNavigationController } from "./path/WebHashNavigationController.js";
import { WebHistoryNavigationController } from "./path/WebHistoryNavigationController.js";
export {
	useWebContext,
	WebContextOptions,
	WebTheme,
	WebHashNavigationController,
	WebHistoryNavigationController,
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
				WebHashNavigationController,
				WebHistoryNavigationController,
			};
		}
		throw Error("Invalid require() call");
	};
}
