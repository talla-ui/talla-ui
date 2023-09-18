import { MessageDialogOptions, UITheme } from "@desk-framework/frame-core";
import { WebContextOptions } from "../WebContext.js";
import {
	importStylesheets,
	resetCSS,
	setControlTextStyle,
	setFocusDecoration,
	setGlobalCSS,
	setLogicalPxScale,
} from "./DOMStyle.js";
import { MessageDialog } from "./MessageDialog.js";
import { ModalMenu } from "./ModalMenu.js";
import { animations } from "./defaults/animations.js";
import { colors } from "./defaults/colors.js";
import { makeBaseCSS } from "./defaults/css.js";
import { icons } from "./defaults/icons.js";
import { defaultControlTextStyle, styles } from "./defaults/styles.js";

/** @internal Modal view implementation for the web context */
export class ModalFactory implements UITheme.ModalControllerFactory {
	buildAlertDialog(options: MessageDialogOptions) {
		return new MessageDialog(options).setAlertButton();
	}
	buildConfirmDialog(options: MessageDialogOptions) {
		return new MessageDialog(options).setConfirmButtons();
	}
	buildMenu(options: UITheme.MenuOptions) {
		return new ModalMenu(options);
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
		this.icons = new Map(icons);
		this.animations = new Map(animations);
		this.colors = new Map(colors);
		this.styles = new Map(styles) as any;
	}
}
