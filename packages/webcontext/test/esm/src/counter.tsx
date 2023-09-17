import {
	JSX,
	PageViewActivity,
} from "../lib/desk-framework-web.es2018.esm.min.js";

const ViewBody = (
	<cell>
		<label labelStyle={{ bold: true, fontSize: 36 }}>Count: %[count]</label>
		<spacer height={32} />
		<row align="center">
			<button onClick="CountDown">Down</button>
			<button onClick="CountUp">Up</button>
		</row>
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
