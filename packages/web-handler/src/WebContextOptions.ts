import { Dialog } from "./modals/Dialog.js";
import { MessageDialog } from "./modals/MessageDialog.js";
import { ModalMenu } from "./modals/ModalMenu.js";
import { WebModalViews } from "./WebModalFactory.js";

/**
 * A class that contains configuration options for the web handler.
 * - Set options in the configuration callback passed to {@link useWebContext()}.
 * - Visual appearance (colors, icons, styles) is configured through {@link WebTheme} and {@link setWebTheme()}.
 */
export class WebContextOptions {
	/**
	 * The application base path.
	 * - Set this when the application is hosted in a subdirectory.
	 * - Do not include a trailing slash.
	 */
	basePath = "";

	/**
	 * The navigation mode for the application.
	 * - Set to true to use the DOM History API for navigation.
	 * - Defaults to false, which uses location hashes (e.g., `#/page`).
	 */
	useHistoryAPI = false;

	/**
	 * The history insertion mode for direct navigation to pages or detail paths.
	 * - Set to true or `"page"` to insert the page path into history when navigating directly to a detail path.
	 * - Set to `"root"` to also insert the root path (`""`) into history.
	 * - Allows users to navigate back to the page even if they opened a detail path directly.
	 */
	insertHistory: boolean | "root" | "page" = false;

	/**
	 * The default data for specific keys of `app.localData`.
	 * - Values are used only if no data has been written for the corresponding key yet.
	 * - Data must be serializable as JSON and readable by {@link InputValidator}.
	 */
	defaultLocalData: Record<string, unknown> = {};

	/**
	 * The database name for storing `app.localData` objects in IndexedDB.
	 * - Defaults to `"LocalData"`.
	 * - Change this if multiple applications on the same page may use conflicting databases.
	 */
	localDataName = "LocalData";

	/**
	 * A list of URLs for external CSS files to import.
	 * - These stylesheets are loaded when the web context is initialized.
	 */
	importCSS: string[] = [];

	/**
	 * A set of functions that return view builders used by modal views.
	 * - Includes functions that return builders for individual parts of dialogs, message dialogs, and context menus.
	 * - Modify the properties of this object directly to customize modal appearance.
	 */
	modalViews: WebModalViews = {
		DialogContainer: Dialog.Container,
		MessageDialogContainer: MessageDialog.Container,
		MessageContainer: MessageDialog.MessageContainer,
		MessageButtonContainer: MessageDialog.ButtonContainer,
		FirstMessageText: MessageDialog.FirstMessageText,
		MessageText: MessageDialog.MessageText,
		MessageConfirmButton: MessageDialog.ConfirmButton,
		MessageButton: MessageDialog.Button,
		MenuContainer: ModalMenu.Container,
		MenuItemCell: ModalMenu.ItemCell,
		MenuItemText: ModalMenu.ItemText,
		MenuItemHint: ModalMenu.ItemHint,
		MenuTitleText: ModalMenu.TitleText,
		MenuDivider: ModalMenu.Divider,
	};

	/**
	 * The viewport column width in pixels.
	 * - Defaults to 300.
	 * - Used by {@link Viewport} to calculate responsive breakpoints.
	 */
	viewportColumnWidth = 300;

	/**
	 * The viewport row height in pixels.
	 * - Defaults to 300.
	 * - Used by {@link Viewport} to calculate responsive breakpoints.
	 */
	viewportRowHeight = 300;

	/**
	 * The fallback frame render interval in milliseconds.
	 * - Defaults to 30.
	 * - Used when requestAnimationFrame does not trigger (e.g., when the tab is inactive).
	 */
	missedFrameTime = 30;
}
