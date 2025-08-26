import {
	UI,
	UIAnimation,
	UIColor,
	UIIconResource,
	UIStyle,
} from "@talla-ui/core";
import { ConfigOptions } from "@talla-ui/util";
import { Dialog } from "./modals/Dialog.js";
import { MessageDialog } from "./modals/MessageDialog.js";
import { ModalMenu } from "./modals/ModalMenu.js";

/**
 * A class that contains options for the web handler instance
 * - These options should be set in a configuration callback passed to {@link useWebContext}.
 */
export class WebContextOptions extends ConfigOptions {
	/** The application base path */
	basePath = "";

	/** True if the DOM history API should be used, rather than location hashes */
	useHistoryAPI = false;

	/**
	 * True if root and/or page entries should be inserted into DOM history when browsing to a page or detail path directly
	 * - Setting this option to true or `page` will allow users to navigate back to the page even if they opened a detail path in a new tab or from a bookmark.
	 * - Setting this option to `root` also inserts a root path (i.e. page `""`) into the history.
	 */
	insertHistory: boolean | "root" | "page" = false;

	/**
	 * Default data for specific keys of `app.localData`
	 * - Each of the properties of this object gets used by `app.localData` **only** if no data has been written for the corresponding key yet (or it has been cleared).
	 * - Data must be serializable as JSON, and readable by {@link InputValidator}.
	 */
	defaultLocalData: Record<string, unknown> = {};

	/**
	 * Database name to be used when storing and retrieving `app.localData` objects from IndexedDB
	 * - This property defaults to `LocalData`, and may be modified if multiple applications run on the same page that may be using conflicting databases.
	 */
	localDataName = "LocalData";

	/** A list of URLs for CSS files to import */
	importCSS: string[] = [];

	/** An optional set of color overrides that are applied as theme colors*/
	colors?: Partial<Record<UI.ColorName, UIColor | string>>;

	/** An optional set of color overrides that, if set, are applied automatically when a dark color scheme is detected */
	darkColors?: Partial<Record<UI.ColorName, UIColor | string>>;

	/** An optional set of icon overrides that are applied as theme icons */
	icons?: Partial<Record<UI.IconName, UIIconResource>>;

	/** An optional set of animation overrides that are applied as theme animations */
	animations?: Partial<Record<UI.AnimationName, UIAnimation>>;

	/** An optional set of style overrides that are applied as theme button styles */
	buttonStyles?: Partial<Record<UI.styles.ButtonStyleName, UIStyle>>;

	/** An optional set of style overrides that are applied as theme label styles */
	labelStyles?: Partial<Record<UI.styles.LabelStyleName, UIStyle>>;

	/** An optional set of style overrides that are applied as theme image styles */
	imageStyles?: Partial<Record<UI.styles.ImageStyleName, UIStyle>>;

	/** An optional set of style overrides that are applied as theme textfield styles */
	textfieldStyles?: Partial<Record<UI.styles.TextfieldStyleName, UIStyle>>;

	/** An optional set of style overrides that are applied as theme toggle styles */
	toggleStyles?: Partial<Record<UI.styles.ToggleStyleName, UIStyle>>;

	/** An optional set of style overrides that are applied as theme divider styles */
	dividerStyles?: Partial<Record<UI.styles.DividerStyleName, UIStyle>>;

	/** Control text styles, defaults to system font at 14 logical pixels if not set */
	controlTextStyle?: UIStyle.StyleOptions;

	/** Custom focus (outline) decoration styles, if any */
	focusDecoration?: UIStyle.StyleOptions;

	/**
	 * Page background color (or CSS value), defaults to Background color
	 * - Use a preset color rather than a specific color to allow the color to change with color presets. The page background is updated dynamically when the app is remounted.
	 */
	pageBackground: UIColor | string = UI.colors.background;

	/**
	 * Modal shade backdrop color (or CSS value), defaults to darkened Text color at low opacity
	 * - Use a preset color rather than a specific color to allow the color to change with color presets. The modal shade color is updated dynamically when the app is remounted.
	 */
	modalShadeBackground: UIColor | string = UI.colors.text
		.brighten(-0.8)
		.alpha(0.3);

	/**
	 * Options for the appearance of the default modal dialog view (container)
	 * - These styles can be changed directly on this object. Refer to {@link WebDialogStyles} for details.
	 * @see {@link WebDialogStyles}
	 */
	dialogStyles = Dialog.styles;

	/**
	 * Options for the appearance of the default modal message dialog view
	 * - These styles can be changed directly on this object. Refer to {@link WebMessageDialogStyles} for details.
	 * @see {@link WebMessageDialogStyles}
	 */
	messageDialogStyles = MessageDialog.styles;

	/**
	 * Options for the appearance of the default modal menu view
	 * - These styles can be changed directly on this object. Refer to {@link WebModalMenuStyles} for details.
	 * @see {@link WebModalMenuStyles}
	 */
	modalMenuStyles = ModalMenu.styles;

	/** Viewport column width in pixels, defaults to 300 */
	viewportColumnWidth = 300;

	/** Viewport row height in pixels, defaults to 300 */
	viewportRowHeight = 300;

	/** True if all anumations should be disabled */
	reducedMotion = false;

	/** Relative scale of logical pixels, defaults to 1 */
	logicalPxScale = 1;

	/** Relative scale of logical pixels for narrow screens (< 600px), defaults to (16/14) to upscale 14px text to 16px */
	logicalPxScaleNarrow = 16 / 14;

	/** Time (in ms) between frame renders if animation frame doesn't trigger */
	missedFrameTime = 30;
}
