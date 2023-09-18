import { MessageDialogOptions } from "../../../../lib/desk-framework-web.es2015.esm.min";

export default {
	negativeError: new MessageDialogOptions(
		["Can’t count down further", "This counter doesn’t go below zero."],
		"OK",
	),
};
