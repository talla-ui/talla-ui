import { setWebTheme, useWebContext, WebTheme } from "@talla-ui/web-handler";
import { SearchActivity } from "./SearchActivity";
import { initializeSwap } from "./swap";

initializeSwap();

const app = useWebContext(() => {
	setWebTheme(
		new WebTheme().updateBodyStyle(false).focusDecoration({}).controlTextStyle({
			fontFamily: "inherit",
			fontSize: 16,
			fontWeight: "normal",
		}),
	);
});
app.addActivity(new SearchActivity(), true);
