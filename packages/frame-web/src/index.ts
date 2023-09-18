export * from "@desk-framework/frame-core";
import * as desk from "@desk-framework/frame-core";
import { WebContextOptions, useWebContext } from "./WebContext.js";
import { WebTheme } from "./style/WebTheme.js";
import { WebHashActivationPath } from "./path/WebHashActivationPath.js";
import { WebHistoryActivationPath } from "./path/WebHistoryActivationPath.js";
export {
	useWebContext,
	WebContextOptions,
	WebTheme,
	WebHashActivationPath,
	WebHistoryActivationPath,
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
				WebHashActivationPath,
				WebHistoryActivationPath,
			};
		}
		throw Error("Invalid require() call");
	};
}
