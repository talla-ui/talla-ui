import { Activity, app, bound, ui } from "@desk-framework/frame-core";

const ViewBody = ui.cell(
	ui.column(
		{ distribute: "center" },
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

app.hotReload(import.meta.webpackHot, CountActivity);
