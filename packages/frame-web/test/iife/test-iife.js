/// <reference path="../../lib/desk-framework-web.iife.d.ts" />
const { app, ui, bound } = desk;

(function () {
	const ViewBody = ui.cell(
		ui.label(bound.strf("Count: %n", "count"), {
			bold: true,
			fontSize: 36,
		}),
		ui.spacer(0, 32),
		ui.row(
			{ align: "center" },
			ui.button("Down", "CountDown"),
			ui.button("Up", "CountUp"),
		),
	);

	class CountActivity extends desk.Activity {
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

	desk.useWebContext();
	app.addActivity(new CountActivity(), true);
})();
