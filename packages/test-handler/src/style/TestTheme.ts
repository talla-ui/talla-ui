import { MessageDialogOptions, UITheme, View } from "talla-ui";
import { TestDialog } from "./TestDialog.js";
import { TestMessageDialog } from "./TestMessageDialog.js";
import { TestModalMenu } from "./TestModalMenu.js";
import { colors } from "./colors.js";
import { icons } from "./icons.js";

/** @internal Modal view implementation for the test handler */
export class TestModalFactory implements UITheme.ModalControllerFactory {
	buildDialog(view: View) {
		return new TestDialog(view);
	}
	buildAlertDialog(options: MessageDialogOptions) {
		return new TestMessageDialog(options).setAlertButton();
	}
	buildConfirmDialog(options: MessageDialogOptions) {
		return new TestMessageDialog(options).setConfirmButtons();
	}
	buildMenu(options: UITheme.MenuOptions) {
		return new TestModalMenu(options);
	}
}

/** @internal */
export class TestTheme extends UITheme {
	constructor() {
		super();
		this.colors = new Map(colors);
		this.icons = new Map(icons);
		this.modalFactory = new TestModalFactory();
	}
}
