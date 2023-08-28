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
	<cell background={UIColor.PageBackground}>
		<row height={60}>
			<spacer width={16} />
			<h2>Sample</h2>
			<spacer />
			<LightDarkToggle />
			<spacer width={16} />
		</row>
		<separator />
		<view view={bound("countActivity")} />
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
		app.theme.colors = {
			...app.theme.colors,
			PageBackground: UIColor.White,
			Background: UIColor.White,
			Primary: UIColor.Blue,
			PrimaryBackground: UIColor.Blue,
		};
		app.renderer?.remount();
	}
	onSetDarkMode() {
		if (!app.theme) return;
		app.theme.colors = {
			...app.theme.colors,
			PageBackground: new UIColor("#111"),
			Background: new UIColor("#111"),
			Primary: UIColor.Green,
			PrimaryBackground: UIColor.Green.brighten(-0.25),
		};
		app.renderer?.remount();
	}
}
