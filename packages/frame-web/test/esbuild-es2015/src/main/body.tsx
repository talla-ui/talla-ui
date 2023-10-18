import { bound, JSX } from "../../../../lib/desk-framework-web.es2015.esm.min";
import themeToggle from "./themeToggle";

export default (
	<cell>
		<row padding={16}>
			<h1>Sample</h1>
			<spacer />
			{themeToggle}
		</row>
		<render view={bound("countActivity.view")} />
	</cell>
);
