const app = desk.useWebContext();
const view = desk.UICell.with(
	{ padding: 8 },
	desk.UICenterRow.with(
		desk.UIColumn.with(
			desk.UILabel.withText("One"),
			desk.UILabel.withText("Two"),
			desk.UILabel.withText("Three")
		),
		desk.UISeparator.with({ vertical: true }),
		desk.UIColumn.with(
			desk.UILabel.withText("One"),
			desk.UILabel.withText("Two"),
			desk.UILabel.withText("Three")
		),
		desk.UISeparator.with({ vertical: true }),
		desk.UIColumn.with(
			desk.UILabel.withText("One"),
			desk.UILabel.withText("Two"),
			desk.UILabel.withText("Three")
		)
	)
);
app.render(new view(), { mode: "page" });
