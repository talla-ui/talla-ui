const app = desk.useWebContext();
const cellStyle = desk.UIStyle.Cell.extend(
	{
		decoration: {
			borderThickness: 1,
			borderColor: desk.UIColor.Separator,
		},
	},
	{
		selected: {
			decoration: { dropShadow: 0.5 },
		},
	}
);
const myCell = desk.UICell.with(
	{ onClick: "+Select", style: cellStyle },
	desk.UILabel.withText(
		desk.bound.boolean("selected").select("Selected", "Not selected")
	)
);
const view = desk.UISelectionController.with(
	desk.UIColumn.with({ padding: 8, spacing: 8 }, myCell, myCell, myCell)
);
app.render(new view(), { mode: "page" });
