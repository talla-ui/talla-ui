import { Activity, app, bound, ui } from "@desk-framework/frame-core";

const ViewBody = ui.page(
	ui.cell(
		ui.label(bound.strf("Count: %i", "count"), { bold: true, fontSize: 36 }),
		ui.spacer({ height: 32 }),
		ui.row(
			{ align: "center" },
			ui.button("Down", "CountDown"),
			ui.button("Up", "CountUp"),
		),
	),
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

app.hotReload(import.meta.webpackHot, CountActivity);
