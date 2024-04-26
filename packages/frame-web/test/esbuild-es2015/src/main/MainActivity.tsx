import {
	app,
	UIButton,
	ViewEvent,
	Activity,
	ui,
	WebTheme,
} from "../../../../lib/desk-framework-web.es2015.esm.min";
import { CountActivity } from "../count/CountActivity";
import text from "../text";
import body from "./body";

export class MainActivity extends Activity {
	navigationPageId = "main";
	countActivity = this.attach(new CountActivity());

	protected async afterActiveAsync() {
		await this.countActivity.activateAsync();
	}

	protected override createView() {
		return new body();
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

	async onZoomMenu(e: ViewEvent<UIButton>) {
		let size = await app.showModalMenuAsync(text.zoomMenu, e.source);
		if (size) {
			WebTheme.setLogicalPxScale(parseFloat(size));
		}
	}
}
