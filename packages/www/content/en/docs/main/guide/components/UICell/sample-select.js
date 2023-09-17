const app = desk.useWebContext();
const SelectableCellStyle = desk.UICellStyle.extend(
	{
		borderThickness: 1,
		borderColor: desk.UIColor["@separator"],
	},
	{
		[desk.UITheme.STATE_SELECTED]: true,
		decoration: { dropShadow: 0.5 },
	},
);
const myCell = desk.UICell.with(
	{ onClick: "+Select", cellStyle: SelectableCellStyle },
	desk.UILabel.withText(
		desk.bound.boolean("selected").select("Selected", "Not selected"),
	),
);
const view = desk.UISelectionController.with(
	desk.UIColumn.with({ padding: 8, spacing: 8 }, myCell, myCell, myCell),
);
app.render(new view(), { mode: "page" });
