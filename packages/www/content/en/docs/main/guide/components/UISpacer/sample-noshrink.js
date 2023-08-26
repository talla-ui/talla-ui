const app = desk.useWebContext();
const view = desk.UICell.with(
	desk.UIRow.with(
		{ padding: 8 },
		desk.UILabel.withText("A row with..."),
		desk.UISpacer,
		desk.UILabel.withText("...a spacer")
	)
);
app.render(new view(), { mode: "page" });
