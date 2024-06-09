import { Activity, ui } from "../lib/desk-framework-web.es2018.esm.min.js";

const ViewBody = (
	<mount page>
		<column>
			<label style={{ bold: true, fontSize: 36, tabularNums: true }}>
				Count: %[count]
			</label>
			<spacer height={32} />
			<row align="center">
				<button onClick="CountDown">Down</button>
				<button onClick="CountUp">Up</button>
			</row>
		</column>
	</mount>
);

export class CountActivity extends Activity {
	createView() {
		return new ViewBody();
	}

	count = 0;

	onCountDown() {
		if (this.count > 0) this.count--;
	}

	onCountUp() {
		this.count++;
	}
}
