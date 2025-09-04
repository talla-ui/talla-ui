import { UI, UIColor } from "@talla-ui/core";
import { useWebContext } from "@talla-ui/web-handler";
import { MainActivity } from "./main";

useWebContext((options) => {
	options.colors = {
		primary: UI.colors.blue,
	};
	options.darkColors = {
		background: new UIColor("#111"),
	};
	options.dialogStyles.containerModifier = (cell) =>
		cell.style(
			options.dialogStyles.containerStyle.override({
				borderColor: UI.colors.red,
			}),
		);
}).addActivity(new MainActivity(), true);
