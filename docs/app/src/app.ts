import { useWebContext } from "@talla-ui/web-handler";
import { SearchActivity } from "./SearchActivity";
import { initializeSwap } from "./swap";

initializeSwap();

const app = useWebContext((options) => {
	options.focusDecoration = {};
	options.controlTextStyle = {
		fontFamily: "inherit",
		fontSize: 16,
		fontWeight: "normal",
	};
});
app.addActivity(new SearchActivity(), true);
