export * from "desk-frame";
import * as desk from "desk-frame";
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
		if (s === "desk-frame" || s === "@desk-framework/webcontext") {
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
