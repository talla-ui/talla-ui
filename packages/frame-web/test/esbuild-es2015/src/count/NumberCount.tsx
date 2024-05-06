import {
	ViewComposite,
	bound,
	ui,
} from "../../../../lib/desk-framework-web.es2015.esm.min";

export default ViewComposite.define(
	{ count: 0 },
	<column>
		<label>Count:</label>
		<label style={{ bold: true, fontSize: 36 }}>{bound.number("count")}</label>
	</column>,
);
