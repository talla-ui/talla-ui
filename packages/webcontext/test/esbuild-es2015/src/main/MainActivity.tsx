import {
	app,
	PageViewActivity,
	UIButton,
	UIColor,
	ViewEvent,
} from "../../../../lib/desk-framework-web.es2015.esm.min";
import { CountActivity } from "../count/CountActivity";
import body from "./body";

export class MainActivity extends PageViewActivity {
	static ViewBody = body;

	path = "/main";
	countActivity = this.attach(new CountActivity());

	protected override async afterActiveAsync() {
		await super.afterActiveAsync();
		await this.countActivity.activateAsync();
	}

	selectedTheme: string = "light";

	onSetTheme(e: ViewEvent<UIButton>) {
		if (!app.theme) return;
		app.theme = app.theme.clone();
		this.selectedTheme = e.source.value!;
		app.theme.colors.set(
			"background",
			this.selectedTheme === "dark" ? "#111" : UIColor["@white"],
		);
		app.renderer?.remount();
	}
}
