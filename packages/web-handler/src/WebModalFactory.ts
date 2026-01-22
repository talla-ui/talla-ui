import {
	MessageDialogOptions,
	ModalFactory,
	ModalMenuOptions,
	UIButton,
	UIColumn,
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
 * Functions that are used by default modal views (dialog, message dialog, and modal menu)
 * - View builder functions can be changed directly on this object, to customize modal appearance.
 */
export interface WebModalViews {
	DialogContainer(): UIContainer.ContainerBuilder;
	MessageDialogContainer(): UIContainer.ContainerBuilder;
	MessageContainer(): UIContainer.ContainerBuilder;
	MessageButtonContainer(): UIContainer.ContainerBuilder;
	FirstMessageText(): UIText.TextBuilder;
	MessageText(): UIText.TextBuilder;
	MessageConfirmButton(): UIButton.ButtonBuilder;
	MessageButton(): UIButton.ButtonBuilder;
	MenuContainer(): UIContainer.ContainerBuilder;
	MenuItemRow(): UIColumn.ColumnBuilder;
	MenuItemText(): UIText.TextBuilder;
	MenuItemHint(): UIText.TextBuilder;
	MenuTitleText(): UIText.TextBuilder;
	MenuDivider(): UIDivider.DividerBuilder;
}

/** @internal Modal factory interface */
export class WebModalFactory implements ModalFactory {
	constructor(options: WebContextOptions) {
		let modalViews = options.modalViews;
		Dialog.Container = modalViews.DialogContainer;
		Dialog.dialogEffect = options.dialogEffect;
		MessageDialog.Container = modalViews.MessageDialogContainer;
		MessageDialog.MessageContainer = modalViews.MessageContainer;
		MessageDialog.ButtonContainer = modalViews.MessageButtonContainer;
		MessageDialog.FirstMessageText = modalViews.FirstMessageText;
		MessageDialog.MessageText = modalViews.MessageText;
		MessageDialog.ConfirmButton = modalViews.MessageConfirmButton;
		MessageDialog.Button = modalViews.MessageButton;
		ModalMenu.Container = modalViews.MenuContainer;
		ModalMenu.menuEffect = options.menuEffect;
		ModalMenu.ItemRow = modalViews.MenuItemRow;
		ModalMenu.ItemText = modalViews.MenuItemText;
		ModalMenu.ItemHint = modalViews.MenuItemHint;
		ModalMenu.TitleText = modalViews.MenuTitleText;
		ModalMenu.Divider = modalViews.MenuDivider;
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
