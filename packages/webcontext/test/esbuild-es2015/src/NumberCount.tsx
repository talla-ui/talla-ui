import {
	bound,
	JSX,
	UIStyle,
	ViewComposite,
} from "../../../lib/desk-framework-web.es2015.esm.min";

const styles = {
	counter: UIStyle.Label.extend({
		textStyle: { fontSize: 36, bold: true },
		decoration: { cssClassNames: ["BigCounter"] },
	}),
};

export default ViewComposite.define<{ count: number }>(
	<column>
		<label>Count:</label>
		<label style={styles.counter}>{bound.number("count")}</label>
	</column>
);
