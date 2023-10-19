/// <reference path="../../lib/desk-framework-web.iife.d.ts" />

(function () {
	const ViewBody = desk.UICell.with(
		desk.UILabel.withText(desk.bound.strf("Count: %n", "count"), {
			bold: true,
			fontSize: 36,
		}),
		desk.UISpacer.withHeight(32),
		desk.UIRow.with(
			{ align: "center" },
			desk.UIButton.withLabel("Down", "CountDown"),
			desk.UIButton.withLabel("Up", "CountUp"),
		),
	);

	class CountActivity extends desk.Activity {
		ready() {
			this.view = new ViewBody();
			desk.app.showPage(this.view);
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
	desk.app.addActivity(new CountActivity(), true);
})();
