import { MessageDialogOptions } from "./MessageDialogOptions.js";
import { ModalMenuOptions } from "./ModalMenuOptions.js";
import { RenderContext } from "./RenderContext.js";
import { View } from "./View.js";

/**
 * An interface that contains methods for creating modal views, defined by the renderer
 * - An object of this type is assigned to {@link RenderContext.modalFactory}, which is used by `app` methods that display modal views, as well as {@link Activity} when using the `dialog` rendering mode.
 */
export interface ModalFactory {
	/** A factory method that returns an instance that implements the {@link DialogController} interface, for the provided view */
	buildDialog?: (view: View) => ModalFactory.DialogController;
	/** A factory method that returns an instance that implements the {@link AlertDialogController} interface, using the provided dialog options */
	buildAlertDialog?: (
		options: MessageDialogOptions,
	) => ModalFactory.AlertDialogController;
	/** A factory method that returns an instance that implements the {@link ConfirmDialogController} interface, using the provided dialog options */
	buildConfirmDialog?: (
		options: MessageDialogOptions,
	) => ModalFactory.ConfirmDialogController;
	/** A factory method that returns an instance that implements the {@link MenuController} interface, using the provided menu options */
	buildMenu?: (options: ModalMenuOptions) => ModalFactory.MenuController;
}

export namespace ModalFactory {
	/**
	 * An interface for a class that manages a modal dialog view
	 * @see {@link AppContext.ModalControllerFactory}
	 */
	export interface DialogController {
		/** Display the dialog, until the content view is unlinked */
		show(place?: Partial<RenderContext.PlacementOptions>): void;
	}

	/**
	 * An interface for a class that manages a modal alert dialog view
	 * @see {@link ModalFactory}
	 */
	export interface AlertDialogController {
		/** Display the dialog */
		showAsync(
			place?: Partial<RenderContext.PlacementOptions>,
		): Promise<unknown>;
	}

	/**
	 * An interface for a class that manages a modal confirmation dialog view
	 * @see {@link ModalFactory}
	 */
	export interface ConfirmDialogController {
		/** Display the dialog */
		showAsync(
			place?: Partial<RenderContext.PlacementOptions>,
		): Promise<{ confirmed: boolean; other?: boolean }>;
	}

	/**
	 * An interface for a class that manages a modal (dropdown) menu view
	 * @see {@link ModalFactory}
	 */
	export interface MenuController {
		/** Display the menu and get the result */
		showAsync(
			place?: Partial<RenderContext.PlacementOptions>,
		): Promise<{ key: string } | undefined>;
	}
}
