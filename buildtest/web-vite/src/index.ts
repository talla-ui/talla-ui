import {
	setWebTheme,
	useAnimationEffects,
	useContainerEffects,
	useDragEffects,
	useWebContext,
	WebTheme,
} from "@talla-ui/web-handler";
import { app, UI, UIColor } from "talla-ui";
import { MainActivity } from "./main";

useWebContext();
useAnimationEffects();
useDragEffects();
useContainerEffects();
setWebTheme(
	new WebTheme()
		.colors({
			accent: UI.colors.blue,
		})
		.darkColors({
			background: new UIColor("#111"),
			accent: UI.colors.yellow,
		})
		.textFieldStyle("default", { borderWidth: { bottom: 2 }, borderRadius: 0 })
		// Custom button variant for toggle/switch buttons
		.buttonStyle("toggleButton", {
			borderRadius: 4,
			minWidth: "0",
			"+pressed": {
				background: UI.colors.accent,
				textColor: UI.colors.accent.text(),
				css: { "--button-state-opacity": "0" } as {},
			},
		}),
);

app.addActivity(new MainActivity(), true);
