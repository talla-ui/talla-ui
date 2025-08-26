import {
	MessageDialogOptions,
	ModalFactory,
	ModalMenuOptions,
	View,
} from "@talla-ui/core";
import { TestDialog } from "./modals/TestDialog.js";
import { TestMessageDialog } from "./modals/TestMessageDialog.js";
import { TestModalMenu } from "./modals/TestModalMenu.js";

export class TestModalFactory implements ModalFactory {
	buildDialog(view: View): TestDialog {
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
