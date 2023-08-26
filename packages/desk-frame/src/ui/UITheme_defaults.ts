import { UIColor } from "./UIColor.js";
import { UIStyle } from "./UIStyle.js";

let _defaultStyles: { [id: string]: UIStyle } | undefined;

/** @internal */
export function getDefaultStyles(): typeof _defaultStyles {
	if (_defaultStyles) return _defaultStyles;

	const controlStyle = new UIStyle("_control", undefined, {
		dimensions: { shrink: 1, grow: 0 },
		textStyle: {
			lineHeight: 1,
			bold: false,
			italic: false,
			lineBreakMode: "pre",
		},
	});

	const buttonStyle = controlStyle.extend("_button", {
		textStyle: {
			align: "center",
			lineBreakMode: "ellipsis",
			lineHeight: 1.4,
		},
		decoration: {
			borderThickness: 0,
			background: UIColor.ControlBase,
			padding: 8,
		},
	});

	// Implementation note: labels reach about 200% height of
	// the base font size, spread across line height (40%) and
	// padding (60%), hence the seemingly arbitrary numbers here.
	const labelStyle = controlStyle.extend("_label", {
		textStyle: { lineBreakMode: "ellipsis", lineHeight: 1.4 },
		decoration: { padding: { y: 6 } },
	});

	const tfStyle = controlStyle.extend("_textfield", {
		decoration: {
			borderThickness: 1,
			borderColor: UIColor.ControlBase,
			padding: 8,
		},
		textStyle: {
			lineBreakMode: "pre-wrap",
			lineHeight: 1.4,
		},
	});

	_defaultStyles = {
		Control: controlStyle,
		Button: buttonStyle,
		BorderlessButton: buttonStyle,
		PrimaryButton: buttonStyle,
		OutlineButton: buttonStyle,
		LinkButton: buttonStyle,
		IconButton: buttonStyle,
		TextField: tfStyle,
		BorderlessTextField: tfStyle,
		Toggle: controlStyle.extend({
			textStyle: { lineBreakMode: "ellipsis", lineHeight: 1.4 },
		}),
		Label: labelStyle,
		CloseLabel: labelStyle.extend("_closelabel", {
			textStyle: { lineHeight: 1.2 },
			decoration: { padding: 0 },
		}),
		Paragraph: labelStyle.extend("_paragraph", {
			textStyle: { lineBreakMode: "pre-wrap" },
		}),
		Heading1: labelStyle,
		Heading2: labelStyle,
		Heading3: labelStyle,
		Image: controlStyle.extend("_image", {
			position: { gravity: "center" },
		}),
	};
	return _defaultStyles;
}

/** @internal */
export function getDefaultColors() {
	return {
		Black: new UIColor("#000000"),
		DarkerGray: new UIColor("#333333"),
		DarkGray: new UIColor("#777777"),
		Gray: new UIColor("#aaaaaa"),
		LightGray: new UIColor("#dddddd"),
		White: new UIColor("#ffffff"),
		Slate: new UIColor("#667788"),
		LightSlate: new UIColor("#c0c8d0"),
		Red: new UIColor("#ee3333"),
		Orange: new UIColor("#ee9922"),
		Yellow: new UIColor("#ddcc33"),
		Lime: new UIColor("#99bb33"),
		Green: new UIColor("#44aa44"),
		Turquoise: new UIColor("#33aaaa"),
		Cyan: new UIColor("#33bbbb"),
		Blue: new UIColor("#3355aa"),
		Violet: new UIColor("#5533aa"),
		Purple: new UIColor("#8833aa"),
		Magenta: new UIColor("#dd4488"),
		Primary: new UIColor("@Blue"),
		PrimaryBackground: new UIColor("@Blue"),
		Accent: new UIColor("@Purple"),
		PageBackground: new UIColor("@Background"),
		Background: new UIColor("@White"),
		Text: new UIColor("@Background").text(),
		Separator: new UIColor("@Background").contrast(-0.5).alpha(0.2),
		ControlBase: new UIColor("@Background"),
		ModalShade: new UIColor("@Black"),
	};
}
