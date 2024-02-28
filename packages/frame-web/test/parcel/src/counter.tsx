import { Activity, app, ui } from "@desk-framework/frame-core";

const ViewBody = (
	<ui.cell>
		<ui.column distribute="center">
			<ui.label style={{ bold: true, fontSize: 36 }}>Count: %[count]</ui.label>
			<ui.spacer height={32} />
			<ui.row align="center">
				<ui.button onClick="CountDown">Down</ui.button>
				<ui.button onClick="CountUp">Up</ui.button>
			</ui.row>
		</ui.column>
	</ui.cell>
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
