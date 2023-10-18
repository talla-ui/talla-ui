import {
	app,
	UIButton,
	UIColor,
	ViewEvent,
	Activity,
} from "../../../../lib/desk-framework-web.es2015.esm.min";
import { CountActivity } from "../count/CountActivity";
import body from "./body";

export class MainActivity extends Activity {
	path = "/main";
	countActivity = this.attach(new CountActivity());

	protected async afterActiveAsync() {
		await this.countActivity.activateAsync();
	}

	protected override ready() {
		this.view = new body();
		app.render(this.view);
	}

	selectedTheme: string = "light";

	onSetTheme(e: ViewEvent<UIButton>) {
		if (!app.theme) return;
		this.selectedTheme = e.source.value!;
		app.theme = app.theme.clone();
		app.theme.colors.set(
			"background",
			this.selectedTheme === "dark" ? "#111" : UIColor["@white"],
		);
	}
}
