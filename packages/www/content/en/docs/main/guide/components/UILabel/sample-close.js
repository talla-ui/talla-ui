const app = desk.useWebContext();
const view = desk.UICell.with(
	desk.UIColumn.with(
		desk.UICloseLabel.withText("Label one"),
		desk.UICloseLabel.withText("Label two")
	)
);
app.render(new view(), { mode: "page" });
