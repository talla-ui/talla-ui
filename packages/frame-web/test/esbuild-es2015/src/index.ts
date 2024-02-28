import {
	Activity,
	app,
	ui,
	useWebContext,
} from "../../../lib/desk-framework-web.es2015.esm.min";
import { MainActivity } from "./main/MainActivity";

// Use an activity to navigate to the count activity from the base path
class RootActivity extends Activity {
	navigationPageId = "";
	protected async afterActiveAsync() {
		console.log("Redirecting...");
		app.navigate("/main");
	}
}

(window as any).app = useWebContext((options) => {
	options.useHistoryAPI = false;
	options.pageBackground = ui.color.BACKGROUND.brighten(0.3);
})
	.addActivity(new RootActivity())
	.addActivity(new MainActivity());
