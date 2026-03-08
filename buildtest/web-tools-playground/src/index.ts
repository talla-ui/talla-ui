import {
	setWebTheme,
	useAnimationEffects,
	useDragEffects,
	useWebContext,
	WebTheme,
} from "@talla-ui/web-handler";
import { setWebToolsToggleKey, showWebTools } from "@talla-ui/web-tools";
import { UI, UIColor } from "talla-ui";
import { BarActivity } from "./activities/bar";
import { FooActivity } from "./activities/foo";
import { FooDetailActivity } from "./activities/foo-detail";

const app = useWebContext((options) => {
	setWebTheme(
		new WebTheme()
			.colors({ accent: UI.colors.red })
			.darkColors({ background: new UIColor("#111") }),
	);
});

useDragEffects();
useAnimationEffects();

setWebToolsToggleKey("I", { ctrl: true, shift: true });
setWebToolsToggleKey("C", { ctrl: true, shift: true }, "select");
setWebToolsToggleKey("J", { ctrl: true, shift: true }, "console");
showWebTools(undefined);

let barActivity = new BarActivity();
let fooActivity = new FooActivity();
app.addRoutes({
	bar: barActivity,
	foo: fooActivity,
	"foo/:fooId"({ fooId }) {
		let item = fooActivity.items.find((i) => i.title === fooId);
		if (item) return new FooDetailActivity(item);
		app.navigate("foo", { replace: true });
	},
	""() {
		// Redirect to foo
		app.log.debug("Redirecting to foo");
		app.navigate("foo", { replace: true });
	},
	"*"({ path }) {
		// 404
		app.log.error("Page not found", path);
		app.navigate("foo", { replace: true });
	},
});

app.log.debug("App started", app.navigation?.path);
