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

app.log.debug("App started", app.navigation?.path);
if (app.navigation?.path === "") {
	app.log.debug("Navigating from / to foo");
	setTimeout(() => app.navigate("foo"));
}
app.navigation?.listen((e) => {
	if (e.name === "PageNotFound") {
		app.log.error("Page not found", app.navigation?.path);
		app.navigate("foo", { replace: true });
	}
});

app.addActivity(new FooActivity());
app.addActivity(new BarActivity());
