import { ConfigOptions, LazyString, StringConvertible } from "../core/index.js";

/**
 * A representation of the contents of an alert or confirm dialog
 * - Objects of this type are used by {@link UITheme.AlertDialogController} or {@link UITheme.ConfirmDialogController} to display a modal dialog view.
 * @see {@link GlobalContext.showAlertDialogAsync}
 * @see {@link GlobalContext.showConfirmDialogAsync}
 * @see {@link UITheme.AlertDialogController}
 * @see {@link UITheme.ConfirmDialogController}
 */
export class MessageDialogOptions extends ConfigOptions {
	/**
	 * Creates a new object with the specified options
	 * @param messages A message or list of messages that will be displayed in the alert dialog
	 * @param confirmLabel Custom confirm/dismiss button label text (optional)
	 * @param cancelLabel Custom cancel button label text (optional)
	 * @param otherLabel Custom other alternative button label text (optional)
	 */
	constructor(
		messages?: StringConvertible | StringConvertible[],
		confirmLabel?: StringConvertible,
		cancelLabel?: StringConvertible,
		otherLabel?: StringConvertible,
		type?: MessageDialogOptions.DialogType,
	) {
		super();
		this.messages =
			(Array.isArray(messages) && messages) || (messages && [messages]) || [];
		this.confirmLabel = confirmLabel;
		this.cancelLabel = cancelLabel;
		this.otherLabel = otherLabel;
		this.type = type;
	}

	/** A list of messages that will be displayed in the alert dialog */
	messages: StringConvertible[];

	/** Custom confirm/dismiss button label text */
	confirmLabel?: StringConvertible;

	/** Custom cancel button label text */
	cancelLabel?: StringConvertible;

	/** Custom other alternative button label text */
	otherLabel?: StringConvertible;

	/** Type of dialog to be presented */
	type?: MessageDialogOptions.DialogType;

	/**
	 * Returns a new instance, with messages formatted using the provided arguments
	 * - This method can only format strings that are instances of {@link LazyString}, i.e. the result of the {@link strf()} function.
	 * @see {@link LazyString.format}
	 */
	format(...args: any[]) {
		return new MessageDialogOptions(
			this.messages.map((m) =>
				m instanceof LazyString ? m.format(...args) : m,
			),
			this.confirmLabel instanceof LazyString
				? this.confirmLabel.format(...args)
				: this.confirmLabel,
			this.cancelLabel instanceof LazyString
				? this.cancelLabel.format(...args)
				: this.cancelLabel,
			this.otherLabel instanceof LazyString
				? this.otherLabel.format(...args)
				: this.otherLabel,
			this.type,
		);
	}
}

export namespace MessageDialogOptions {
	/**
	 * Type definition for different types of dialogs that may be presented to the user
	 * - Not all types may be used by themes or platforms to display specific versions of message dialogs.
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
