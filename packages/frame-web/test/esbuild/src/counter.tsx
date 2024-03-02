import { Activity, app, ui } from "../../../dist";

const ViewBody = (
	<cell>
		<column distribute="center">
			<label style={{ bold: true, fontSize: 36 }}>Count: %[count]</label>
			<spacer height={32} />
			<row align="center">
				<button onClick="CountDown">Down</button>
				<button onClick="CountUp">Up</button>
			</row>
		</column>
	</cell>
);

export class CountActivity extends Activity {
	ready() {
		this.view = new ViewBody();
		app.showPage(this.view);
	}

	count = 0;

	onCountDown() {
		if (this.count > 0) this.count--;
	}

	onCountUp() {
		this.count++;
	}
}
