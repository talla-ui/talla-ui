import { bound, ui } from "../../../../lib/desk-framework-web.es2015.esm.min";
import _themeToggle from "./_themeToggle";

export default (
	<mount page>
		<scroll>
			<row layout={{ padding: 16 }} position={{ gravity: "overlay" }}>
				<label title>Sample</label>
				<spacer />
				{_themeToggle}
			</row>
			<cell>
				<render view={bound("countActivity.view")} />
			</cell>
		</scroll>
	</mount>
);
