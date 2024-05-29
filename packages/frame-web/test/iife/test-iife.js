const { app, ui, bind } = desk;

(function () {
	const ViewBody = ui.page(
		ui.column(
			ui.label(bind.strf("Count: %n", bind("count")), {
				bold: true,
				fontSize: 36,
			}),
			ui.spacer(0, 32),
			ui.row(
				{ align: "center" },
				ui.button("Down", "CountDown"),
				ui.button("Up", "CountUp"),
			),
		),
	);

	class CountActivity extends desk.Activity {
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

	desk.useWebContext();
	app.addActivity(new CountActivity(), true);
})();
