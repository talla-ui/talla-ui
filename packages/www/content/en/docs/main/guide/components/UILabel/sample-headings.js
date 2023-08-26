const app = desk.useWebContext();
const view = desk.UICell.with(
	desk.UIColumn.with(
		desk.UIHeading1.withText("Heading 1"),
		desk.UIHeading2.withText("Heading 2"),
		desk.UIParagraph.withText("Regular text")
	)
);
app.render(new view(), { mode: "page" });
