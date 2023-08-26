const app = desk.useWebContext();
const view = desk.UICell.with(
	{ padding: 8 },
	desk.UISeparator.with({
		thickness: 2,
		color: desk.UIColor.Red,
	})
);
app.render(new view(), { mode: "page" });
