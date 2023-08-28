import {
	Activity,
	app,
	useWebContext,
} from "../../../lib/desk-framework-web.es2015.esm.min";
import { MainActivity } from "./MainActivity.js";

// Use an activity to navigate to the count activity from the base path
class RootActivity extends Activity {
	path = "/";
	protected async afterActiveAsync() {
		console.log("Redirecting...");
		app.navigate("/main");
	}
}

(window as any).app = useWebContext((options) => {
	options.useHistoryAPI = false;
})
	.addActivity(new RootActivity())
	.addActivity(new MainActivity());
