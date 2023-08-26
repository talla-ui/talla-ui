import { JSX, PageViewActivity, UIStyle } from "../../../dist";

const styles = {
	counter: UIStyle.Label.extend({
		textStyle: { fontSize: 36, bold: true },
		decoration: { cssClassNames: ["BigCounter"] },
	}),
};

const ViewBody = (
	<cell>
		<label style={styles.counter}>Count: %[count]</label>
		<spacer height={32} />
		<centerrow>
			<outlinebutton onClick="CountDown">Down</outlinebutton>
			<outlinebutton onClick="CountUp">Up</outlinebutton>
		</centerrow>
	</cell>
);

export class CountActivity extends PageViewActivity {
	static ViewBody = ViewBody;

	count = 0;

	onCountDown() {
		if (this.count > 0) this.count--;
	}

	onCountUp() {
		this.count++;
	}
}
