import { setWebTheme, useWebContext, WebTheme } from "@talla-ui/web-handler";
import { app, UI, UIColor } from "talla-ui";
import { MainActivity } from "./main";

useWebContext();
setWebTheme(
	new WebTheme()
		.colors({
			accent: UI.colors.blue,
		})
		.darkColors({
			background: new UIColor("#111"),
			accent: UI.colors.yellow,
		})
		// Custom button style for toggle/switch buttons (extends default)
		.customStyle("button", "default", "toggleButton", {
			borderRadius: "0.5rem",
			minWidth: "0",
			"+pressed": {
				background: UI.colors.accent,
				textColor: UI.colors.accent.text(),
			},
		}),
);

app.addActivity(new MainActivity(), true);
