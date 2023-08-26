const app = desk.useWebContext();
const view = desk.UICell.with(
	desk.UIRow.with(
		{ padding: 8 },
		desk.UIExpandedLabel.withText("Expanded label"),
		desk.UIOutlineButton.withLabel("Button")
	)
);
app.render(new view(), { mode: "page" });
