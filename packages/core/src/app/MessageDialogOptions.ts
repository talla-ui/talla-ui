import { DeferredString, StringConvertible } from "@talla-ui/util";
import type { AppContext } from "./AppContext.js";
import type { ModalFactory } from "./ModalFactory.js";

/**
 * A representation of the contents of an alert or confirm dialog
 * - Objects of this type are used by {@link ModalFactory.AlertDialogController} or {@link ModalFactory.ConfirmDialogController} to display a modal dialog view.
 * @see {@link AppContext.showAlertDialogAsync}
 * @see {@link AppContext.showConfirmDialogAsync}
 * @see {@link ModalFactory.AlertDialogController}
 * @see {@link ModalFactory.ConfirmDialogController}
 */
export class MessageDialogOptions {
	/**
	 * Creates a new object with the specified options
	 * @param messages A message or list of messages that will be displayed in the alert dialog
	 * @param confirmText Custom confirm/dismiss button text (optional)
	 * @param cancelText Custom cancel button text (optional)
	 * @param otherText Custom other alternative button text (optional)
	 */
	constructor(
		messages?: StringConvertible | StringConvertible[],
		confirmText?: StringConvertible,
		cancelText?: StringConvertible,
		otherText?: StringConvertible,
		type?: MessageDialogOptions.DialogType,
	) {
		this.messages =
			(Array.isArray(messages) && messages) || (messages && [messages]) || [];
		this.confirmText = confirmText;
		this.cancelText = cancelText;
		this.otherText = otherText;
		this.type = type;
	}

	/** A list of messages that will be displayed in the alert dialog */
	messages: StringConvertible[];

	/** Custom confirm/dismiss button text */
	confirmText?: StringConvertible;

	/** Custom cancel button text */
	cancelText?: StringConvertible;

	/** Custom other alternative button text */
	otherText?: StringConvertible;

	/** Type of dialog to be presented */
	type?: MessageDialogOptions.DialogType;

	/**
	 * Returns a new instance, with messages formatted using the provided arguments
	 * - This method can only format strings that are instances of {@link DeferredString}, i.e. the result of the {@link fmt()} function.
	 * @see {@link fmt}
	 */
	format(...args: any[]) {
		return new MessageDialogOptions(
			this.messages.map((m) =>
				m instanceof DeferredString ? m.format(...args) : m,
			),
			this.confirmText instanceof DeferredString
				? this.confirmText.format(...args)
				: this.confirmText,
			this.cancelText instanceof DeferredString
				? this.cancelText.format(...args)
				: this.cancelText,
			this.otherText instanceof DeferredString
				? this.otherText.format(...args)
				: this.otherText,
			this.type,
		);
	}
}

export namespace MessageDialogOptions {
	/**
	 * Type definition for different types of dialogs that may be presented to the user
	 * - Not all types may be used by modal builders or platforms to display specific versions of message dialogs.
	 * @see {@link MessageDialogOptions.type}
	 */
	export type DialogType =
		| "error"
		| "warning"
		| "info"
		| "success"
		| "question"
		| undefined;
}
