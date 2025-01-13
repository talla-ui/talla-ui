import * as core from "@talla-ui/core";
import { WebContextOptions, useWebContext } from "./WebContext.js";
import { WebTheme } from "./style/WebTheme.js";
import { WebHashNavigationContext } from "./WebHashNavigationContext.js";
import { WebHistoryNavigationContext } from "./WebHistoryNavigationContext.js";
import { WebDialogStyles } from "./style/Dialog.js";
import { WebMessageDialogStyles } from "./style/MessageDialog.js";
import { WebModalMenuStyles } from "./style/ModalMenu.js";
export {
	useWebContext,
	WebContextOptions,
	WebTheme,
	WebHashNavigationContext,
	WebHistoryNavigationContext,
	WebDialogStyles,
	WebMessageDialogStyles,
	WebModalMenuStyles,
};

if (!window.require) {
	(window as any).require = function (s: string) {
		if (s === "talla-ui" || s === "talla-ui" || s === "@talla-ui/web-handler") {
			return {
				...core,
				useWebContext,
				WebContextOptions,
				WebTheme,
				WebHashNavigationContext,
				WebHistoryNavigationContext,
				WebDialogStyles,
				WebMessageDialogStyles,
				WebModalMenuStyles,
			};
		}
		throw Error("Invalid require() call");
	};
}
