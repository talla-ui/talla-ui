const app = desk.useWebContext();
const view = desk.UICell.with(
	desk.UIColumn.with(
		{ padding: 8 },
		desk.UILabel.withText("First label"),
		desk.UILabel.withText("Second label"),
		desk.UILabel.withText("Third label"),
		desk.UIRow.with(
			desk.UIExpandedLabel.withText("UIExpandedLabel in UIRow"),
			desk.UIPrimaryButton.withLabel("UIPrimaryButton"),
		),
		desk.UICell.with(
			{
				borderColor: desk.UIColor["@separator"],
				borderThickness: 1,
				dimensions: { height: 64 },
			},
			desk.UILabel.withText("UILabel in UICell with height"),
		),
	),
);
app.render(new view(), { mode: "page" });
