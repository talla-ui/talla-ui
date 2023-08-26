const app = desk.useWebContext();
const view = desk.UICell.with(
	{
		dimensions: { maxWidth: 200 },
		margin: 8,
		borderColor: desk.UIColor.Separator,
		borderThickness: { bottom: 1 },
	},
	desk.UICenterRow.with(
		{ padding: { x: 4 } },
		desk.UIBorderlessTextField.with({
			placeholder: "Search...",
		}),
		desk.UIIconButton.withIcon(desk.UIIcon.ExpandDown)
	)
);
app.render(new view(), { mode: "page" });
