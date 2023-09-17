const app = desk.useWebContext();
const view = desk.UICell.with(
	desk.UIRow.with(
		{ layout: { wrapContent: true } },
		desk.UICell.with(
			{
				position: { gravity: "start" },
				borderColor: desk.UIColor["@text"],
				borderThickness: 1,
			},
			desk.UICenterRow.with(
				{ spacing: 0 },
				desk.UILabel.with({
					text: "Spacer",
					chevron: "out",
				}),
				desk.UISpacer.withWidth(32),
				desk.UILabel.with({
					text: "Spacer",
					icon: desk.UIIconResource["@expandLeft"],
				}),
			),
		),
		desk.UICell.with(
			desk.UICell.with(
				{
					position: { gravity: "center" },
					borderColor: desk.UIColor["@text"],
					borderThickness: 1,
				},
				desk.UIColumn.with(
					{ spacing: 0 },
					desk.UILabel.withText("Spacer below"),
					desk.UISpacer.withHeight(32),
					desk.UILabel.withText("Spacer above"),
				),
			),
		),
	),
);
app.render(new view(), { mode: "page" });
