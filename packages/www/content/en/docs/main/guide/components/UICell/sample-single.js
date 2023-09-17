const app = desk.useWebContext();
const view = desk.UICell.with(
	{
		margin: 16,
		padding: 8,
		background: desk.UIColor["@blue"].alpha(0.1),
		borderColor: desk.UIColor["@red"],
		borderThickness: 2,
		dropShadow: 1,
	},
	desk.UILabel.withText("Hello, world!"),
);
app.render(new view(), { mode: "page" });
