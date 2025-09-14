import { UIColor } from "@talla-ui/core";
import { useWebContext } from "@talla-ui/web-handler";
import { MainActivity } from "./main";

useWebContext((options) => {
	options.colors = {
		// accent: UI.colors.blue,
	};
	options.darkColors = {
		background: new UIColor("#111"),
	};
}).addActivity(new MainActivity(), true);
