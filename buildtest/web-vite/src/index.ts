import { UI, UIColor } from "@talla-ui/core";
import { useWebContext } from "@talla-ui/web-handler";
import { MainActivity } from "./main";

useWebContext((options) => {
	options.colors = {
		// accent: new UIColor("#ff6699"),
		accent: UI.colors.blue,
	};
	options.darkColors = {
		background: new UIColor("#111"),
	};
}).addActivity(new MainActivity(), true);
