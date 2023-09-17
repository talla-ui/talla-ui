const app = desk.useWebContext();
const view = desk.UICell.with(
	desk.UIColumn.with(
		desk.UIHeading1Label.withText("Heading 1"),
		desk.UIHeading2Label.withText("Heading 2"),
		desk.UIParagraphLabel.withText("Regular text"),
	),
);
app.render(new view(), { mode: "page" });
