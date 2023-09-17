const app = desk.useWebContext();
const view = desk.UICell.with(
	{
		dimensions: { maxWidth: 200 },
		margin: 8,
		borderColor: desk.UIColor["@separator"],
		borderThickness: { bottom: 1 },
	},
	desk.UICenterRow.with(
		{ padding: { x: 4 } },
		desk.UIBorderlessTextField.with({
			placeholder: "Search...",
		}),
		desk.UIIconButton.withIcon(desk.UIIconResource["@expandDown"]),
	),
);
app.render(new view(), { mode: "page" });
