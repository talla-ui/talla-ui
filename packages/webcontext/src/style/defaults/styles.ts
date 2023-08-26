import { UIStyle, UIColor } from "desk-frame";

/** @internal Defaults used for control text style */
export const defaultControlTextStyle = {
	fontFamily:
		'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, "Helvetica Neue", Arial, sans-serif',
	fontSize: "0.875rem",
};

/** @internal Returns an object with default styles, extending the provided base style set */
export function makeStyles(styles: { [id: string]: UIStyle }) {
	let {
		Transparent,
		Primary,
		PrimaryBackground,
		ControlBase,
		Background,
		Text,
	} = UIColor;

	// prepare button style to reuse
	let buttonStyle = styles.Button!.extend(
		"Button",
		{
			dimensions: { minWidth: 104 },
			decoration: {
				borderThickness: 1,
				borderColor: Transparent,
				textColor: Primary,
				borderRadius: 6,
				padding: { y: 8, x: 16 },
				css: {
					cursor: "pointer",
				},
			},
		},
		{
			pressed: {
				decoration: {
					css: {
						transition: "all 200ms ease",
					},
				},
			},
			hover: {
				decoration: {
					css: {
						transition: "all 200ms ease",
					},
				},
			},
			disabled: {
				decoration: {
					background: ControlBase,
					textColor: UIColor.Text,
					css: {
						opacity: ".5",
						cursor: "inherit",
						transition: "all 200ms ease",
					},
				},
			},
		}
	);

	return {
		// paragraph style (to set cursor):
		Paragraph: styles.Paragraph!.extend("Paragraph", {
			decoration: { css: { cursor: "text" } },
		}),

		// heading styles:
		Heading1: styles.Heading1!.extend("Heading1", {
			textStyle: {
				fontSize: "2.75em",
				fontWeight: 500,
				letterSpacing: -0.5,
			},
		}),
		Heading2: styles.Heading2!.extend("Heading2", {
			textStyle: {
				fontSize: "1.5em",
			},
		}),
		Heading3: styles.Heading3!.extend("Heading3", {
			textStyle: {
				fontSize: "1.125em",
				bold: true,
			},
		}),

		// button styles:
		Button: buttonStyle,
		PrimaryButton: buttonStyle.extend(
			"PrimaryButton",
			{
				decoration: {
					background: PrimaryBackground,
					textColor: PrimaryBackground.text(),
					borderColor: PrimaryBackground,
				},
			},
			{
				hover: {
					decoration: {
						background: PrimaryBackground.contrast(0.3),
						borderColor: PrimaryBackground.contrast(0.3),
					},
				},
			}
		),
		BorderlessButton: buttonStyle.extend(
			"BorderlessButton",
			{
				dimensions: { minWidth: 16, minHeight: 16 },
				decoration: { background: Transparent },
			},
			{
				pressed: {
					decoration: {
						background: PrimaryBackground.contrast(0.3),
						borderColor: PrimaryBackground.contrast(0.3),
						textColor: PrimaryBackground.text(),
					},
				},
				hover: {
					decoration: {
						background: ControlBase.contrast(-0.5).alpha(0.3),
						textColor: Primary,
					},
				},
			}
		),
		OutlineButton: buttonStyle.extend(
			"OutlineButton",
			{
				decoration: {
					borderColor: Primary.alpha(0.3),
				},
			},
			{
				hover: {
					decoration: {
						borderColor: Primary,
					},
				},
			}
		),
		LinkButton: buttonStyle.extend(
			"LinkButton",
			{
				dimensions: { minWidth: 16, minHeight: 16 },
				textStyle: { align: "start||left" },
				decoration: { background: Transparent },
			},
			{
				pressed: {
					decoration: {
						background: PrimaryBackground.contrast(0.3),
						borderColor: PrimaryBackground.contrast(0.3),
						textColor: PrimaryBackground.text(),
					},
				},
				hover: {
					textStyle: { underline: true },
					decoration: {
						background: Transparent,
						textColor: Primary,
					},
				},
				disabled: {
					decoration: {
						background: "transparent",
						textColor: Primary,
					},
				},
			}
		),
		IconButton: styles.IconButton!.extend(
			"IconButton",
			{
				dimensions: { minWidth: 32, minHeight: 32 },
				position: { gravity: "center" },
				decoration: {
					borderThickness: 0,
					background: Transparent,
					borderRadius: "50%",
					padding: 0,
					css: {
						cursor: "pointer",
					},
				},
			},
			{
				pressed: {
					decoration: {
						background: PrimaryBackground.contrast(0.3),
						borderColor: PrimaryBackground.contrast(0.3),
						textColor: PrimaryBackground.text(),
					},
				},
				hover: {
					decoration: {
						background: ControlBase.contrast(-0.5).alpha(0.3),
						textColor: Primary,
					},
				},
			}
		),

		// text field styles:
		TextField: styles.TextField!.extend("TextField", {
			decoration: {
				background: Background,
				textColor: Text,
				borderColor: ControlBase.contrast(-0.2),
				borderThickness: 1,
				borderRadius: 6,
				padding: 8,
				css: { cursor: "text" },
			},
		}),
		BorderlessTextField: styles.BorderlessTextField!.extend(
			"BorderlessTextField",
			{
				decoration: {
					background: Transparent,
					textColor: Text,
					borderThickness: 0,
					borderRadius: 0,
					padding: 0,
					css: { cursor: "text" },
				},
			},
			{
				focused: {
					decoration: { css: { outline: "none", boxShadow: "none" } },
				},
			}
		),

		// toggle style (decoration for checkbox itself)
		Toggle: styles.Toggle!.extend("Toggle", {
			decoration: { borderColor: Text },
		}),
	};
}
