import {
	MessageDialogOptions,
	ModalMenuOptions,
	UITheme,
	View,
} from "@talla-ui/core";
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
	buildMenu(options: ModalMenuOptions) {
		return new TestModalMenu(options);
	}
}

/** @internal */
export function makeTheme() {
	return Object.assign(new UITheme(), {
		colors: new Map(colors),
		icons: new Map(icons),
		modalFactory: new TestModalFactory(),
	});
}
