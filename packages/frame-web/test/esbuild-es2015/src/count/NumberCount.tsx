import {
	ViewComposite,
	bound,
	ui,
} from "../../../../lib/desk-framework-web.es2015.esm.min";

export default ViewComposite.withPreset(
	{ count: 0 },
	<ui.column>
		<ui.label>Count:</ui.label>
		<ui.label style={{ bold: true, fontSize: 36 }}>
			{bound.number("count")}
		</ui.label>
	</ui.column>,
);
