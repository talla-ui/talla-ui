import {
	MessageDialogOptions,
	ModalFactory,
	ModalMenuOptions,
	View,
} from "@talla-ui/core";
import { WebContextOptions } from "./WebContextOptions.js";
import { Dialog } from "./modals/Dialog.js";
import { MessageDialog } from "./modals/MessageDialog.js";
import { ModalMenu } from "./modals/ModalMenu.js";

export class WebModalFactory implements ModalFactory {
	constructor(options: WebContextOptions) {
		// update modal styles
		Dialog.styles = options.dialogStyles;
		MessageDialog.styles = options.messageDialogStyles;
		ModalMenu.styles = options.modalMenuStyles;
	}

	buildDialog(view: View): Dialog {
		return new Dialog(view);
	}

	buildAlertDialog(options: MessageDialogOptions) {
		return new MessageDialog(options).setAlertButton();
	}

	buildConfirmDialog(options: MessageDialogOptions) {
		return new MessageDialog(options).setConfirmButtons();
	}

	buildMenu(options: ModalMenuOptions) {
		return new ModalMenu(options);
	}
}
