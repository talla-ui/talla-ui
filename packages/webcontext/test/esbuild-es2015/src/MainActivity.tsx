import {
	app,
	bound,
	JSX,
	PageViewActivity,
	UIColor,
} from "../../../lib/desk-framework-web.es2015.esm.min";
import { CountActivity } from "./CountActivity";
import LightDarkToggle from "./LightDarkToggle";

const ViewBody = (
	<cell background={UIColor["@pageBackground"]}>
		<row height={60}>
			<spacer width={16} />
			<h2>Sample</h2>
			<spacer />
			<LightDarkToggle />
			<spacer width={16} />
		</row>
		<separator />
		<render view={bound("countActivity")} />
	</cell>
);

export class MainActivity extends PageViewActivity {
	static ViewBody = ViewBody;

	path = "/main";
	countActivity = this.attach(new CountActivity());

	protected override async afterActiveAsync() {
		await super.afterActiveAsync();
		await this.countActivity.activateAsync();
	}

	onSetLightMode() {
		if (!app.theme) return;
		app.theme = app.theme.clone();
		app.theme.colors.set("background", UIColor["@white"]);
		app.theme.colors.set("primary", UIColor["@blue"]);
		app.renderer?.remount();
	}
	onSetDarkMode() {
		if (!app.theme) return;
		app.theme = app.theme.clone();
		app.theme.colors.set("background", "#111");
		app.theme.colors.set("primary", UIColor["@green"]);
		app.renderer?.remount();
	}
}
