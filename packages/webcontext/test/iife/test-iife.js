/// <reference path="../../lib/desk-framework-web.iife.d.ts" />

(function () {
	class CountActivity extends desk.PageViewActivity {
		count = 0;
		onCountDown() {
			if (this.count > 0) this.count--;
		}
		onCountUp() {
			this.count++;
		}
	}

	CountActivity.ViewBody = desk.UICell.with(
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

	desk.useWebContext();
	desk.app.addActivity(new CountActivity(), true);
})();
