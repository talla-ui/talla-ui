import {
	MessageDialogOptions,
	ModalFactory,
	ModalMenuOptions,
	UIButton,
	UICell,
	UIContainer,
	UIDivider,
	UIText,
	View,
} from "@talla-ui/core";
import { WebContextOptions } from "./WebContextOptions.js";
import { Dialog } from "./modals/Dialog.js";
import { MessageDialog } from "./modals/MessageDialog.js";
import { ModalMenu } from "./modals/ModalMenu.js";

/**
 * Components that are used by the default modal views (dialog, message dialog, and modal menu)
 * - View builder functions can be changed directly on this object.
 */
export interface WebModalComponents {
	DialogContainer(): UIContainer.ContainerBuilder;
	MessageDialogContainer(): UIContainer.ContainerBuilder;
	MessageContainer(): UIContainer.ContainerBuilder;
	MessageButtonContainer(): UIContainer.ContainerBuilder;
	FirstMessageText(): UIText.TextBuilder;
	MessageText(): UIText.TextBuilder;
	MessageConfirmButton(): UIButton.ButtonBuilder;
	MessageButton(): UIButton.ButtonBuilder;
	MenuContainer(): UIContainer.ContainerBuilder;
	MenuItemCell(): UICell.CellBuilder;
	MenuItemText(): UIText.TextBuilder;
	MenuItemHint(): UIText.TextBuilder;
	MenuTitleText(): UIText.TextBuilder;
	MenuDivider(): UIDivider.DividerBuilder;
}

/** @internal Modal factory interface */
export class WebModalFactory implements ModalFactory {
	constructor(options: WebContextOptions) {
		let modalComponents = options.modalComponents;
		Dialog.Container = modalComponents.DialogContainer;
		MessageDialog.Container = modalComponents.MessageDialogContainer;
		MessageDialog.MessageContainer = modalComponents.MessageContainer;
		MessageDialog.ButtonContainer = modalComponents.MessageButtonContainer;
		MessageDialog.FirstMessageText = modalComponents.FirstMessageText;
		MessageDialog.MessageText = modalComponents.MessageText;
		MessageDialog.ConfirmButton = modalComponents.MessageConfirmButton;
		MessageDialog.Button = modalComponents.MessageButton;
		ModalMenu.Container = modalComponents.MenuContainer;
		ModalMenu.ItemCell = modalComponents.MenuItemCell;
		ModalMenu.ItemText = modalComponents.MenuItemText;
		ModalMenu.ItemHint = modalComponents.MenuItemHint;
		ModalMenu.TitleText = modalComponents.MenuTitleText;
		ModalMenu.Divider = modalComponents.MenuDivider;
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
