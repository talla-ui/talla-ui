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

	const styles = {
		counter: desk.UIStyle.Label.extend({
			textStyle: { fontSize: 36, bold: true },
			decoration: { cssClassNames: ["BigCounter"] },
		}),
	};

	CountActivity.ViewBody = desk.UICell.with(
		desk.UILabel.withText(
			desk.bound.strf("Count: %n", "count"),
			styles.counter
		),
		desk.UISpacer.withHeight(32),
		desk.UICenterRow.with(
			desk.UIOutlineButton.withLabel("Down", "CountDown"),
			desk.UIOutlineButton.withLabel("Up", "CountUp")
		)
	);

	desk.useWebContext();
	desk.app.addActivity(new CountActivity(), true);
})();
