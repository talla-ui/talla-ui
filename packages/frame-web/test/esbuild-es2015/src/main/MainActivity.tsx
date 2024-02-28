import {
	app,
	UIButton,
	ViewEvent,
	Activity,
	ui,
} from "../../../../lib/desk-framework-web.es2015.esm.min";
import { CountActivity } from "../count/CountActivity";
import body from "./body";

export class MainActivity extends Activity {
	navigationPageId = "main";
	countActivity = this.attach(new CountActivity());

	protected async afterActiveAsync() {
		await this.countActivity.activateAsync();
	}

	protected override ready() {
		this.view = new body();
		app.showPage(this.view);
	}

	selectedTheme: string = "light";

	onSetTheme(e: ViewEvent<UIButton>) {
		if (!app.theme) return;
		this.selectedTheme = e.source.value!;
		app.theme = app.theme.clone();
		app.theme.colors.set(
			"Background",
			this.selectedTheme === "dark" ? ui.color("#111") : ui.color.WHITE,
		);
		app.theme.colors.set(
			"Primary",
			this.selectedTheme === "dark" ? ui.color.GREEN : ui.color.BLUE,
		);
	}
}
