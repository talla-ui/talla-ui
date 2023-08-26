import { UITheme, strf } from "desk-frame";
import {
	importStylesheets,
	resetCSS,
	setControlTextStyle,
	setFocusDecoration,
	setGlobalCSS,
	setLogicalPxScale,
} from "./DOMStyle.js";
import { makeBaseCSS } from "./defaults/css.js";
import { icons } from "./defaults/icons.js";
import { animations } from "./defaults/animations.js";
import { defaultControlTextStyle, makeStyles } from "./defaults/styles.js";
import { AlertDialog, alertDialogStyles } from "./AlertDialog.js";
import { ModalMenu, modalMenuStyles } from "./ModalMenu.js";
import { WebContextOptions } from "../WebContext.js";

/** @internal Modal view implementation for the web context */
export class ModalFactory implements UITheme.ModalControllerFactory {
	createAlertDialog() {
		return new AlertDialog();
	}
	createConfirmationDialog() {
		return new AlertDialog(strf("Confirm"), strf("Cancel"));
	}
	createMenu() {
		return new ModalMenu();
	}
}

/** The base web context theme */
export class WebTheme extends UITheme {
	/** @internal Initializes global CSS styles */
	static initializeCSS(options: WebContextOptions) {
		resetCSS();
		setGlobalCSS(makeBaseCSS());
		setLogicalPxScale(options.logicalPxScale);
		importStylesheets(options.importCSS);
		setControlTextStyle({
			...defaultControlTextStyle,
			...options.controlTextStyle,
		});
		if (options.focusDecoration) {
			setFocusDecoration(options.focusDecoration);
		}
	}

	/** Imports an additional set of style sheets from the provided list of URLs */
	static importStylesheets(urls: string[]) {
		importStylesheets(urls);
	}

	/**
	 * Sets the logical pixel scale as a factor of the default value
	 * @note This value can also be set using the options callback provided to {@link useWebContext()}.
	 */
	static setLogicalPxScale(scale: number) {
		setLogicalPxScale(scale);
	}

	/**
	 * Creates a new theme instance
	 * @note It should not be necessary to create a new theme instance at all. You can change the properties of the existing theme (and trigger a re-render if needed by emitting a change event on the renderer) or clone it to create different versions.
	 */
	constructor() {
		super();

		this.modalFactory = new ModalFactory();
		this.icons = icons;
		this.animations = animations;
		this.styles = {
			...this.styles,
			...makeStyles(this.styles),
			...alertDialogStyles,
			...modalMenuStyles,
		};
	}
}
