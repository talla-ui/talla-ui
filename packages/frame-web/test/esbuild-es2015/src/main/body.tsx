import { bound, ui } from "../../../../lib/desk-framework-web.es2015.esm.min";
import _themeToggle from "./_themeToggle";

export default (
	<ui.scroll>
		<ui.row padding={16} position={{ gravity: "overlay" }}>
			<ui.label title>Sample</ui.label>
			<ui.spacer />
			{_themeToggle}
		</ui.row>
		<ui.cell>
			<ui.renderView view={bound("countActivity.view")} />
		</ui.cell>
	</ui.scroll>
);
