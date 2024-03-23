import { useWebContext } from "@desk-framework/frame-web";
import { SearchActivity } from "./SearchActivity";
import { initializeSwap } from "./swap";

initializeSwap();

const app = useWebContext((options) => {
	options.focusDecoration = {};
	options.controlTextStyle = {
		fontFamily: "inherit",
		fontSize: 16,
		fontWeight: "300",
	};
});
const searchActivity = new SearchActivity();
app.addActivity(searchActivity, true);
