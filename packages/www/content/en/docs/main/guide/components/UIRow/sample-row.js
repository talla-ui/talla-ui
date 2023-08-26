const app = desk.useWebContext();
const view = desk.UIRow.with(
	{ padding: 8 },
	desk.UIPrimaryButton.withLabel("UIPrimaryButton"),
	desk.UIExpandedLabel.withText("UIExpandedLabel"),
	desk.UILabel.withText("UILabel")
);
app.render(new view(), { mode: "page" });
