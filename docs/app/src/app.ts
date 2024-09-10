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
const searchActivity = new SearchActivity();
app.addActivity(searchActivity, true);
