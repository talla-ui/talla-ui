import {
	MessageDialogOptions,
	UITheme,
	ui,
} from "../../../lib/desk-framework-web.es2015.esm.min";

export default {
	negativeError: new MessageDialogOptions(
		["Can’t count down further", "This counter doesn’t go below zero."],
		"OK",
	),

	zoomMenu: new UITheme.MenuOptions(
		[
			{ text: "Smaller", key: "0.85", icon: ui.icon.MINUS },
			{ text: "Normal", key: "1", icon: ui.icon.MORE },
			{ text: "Larger", key: "1.25", icon: ui.icon.PLUS },
		],
		140,
	),
};
