const app = desk.useWebContext();
const buttonStyle = desk.UIStyle.OutlineButton.extend(
	{},
	{
		selected: {
			decoration: {
				background: desk.UIColor.PrimaryBackground,
				textColor: desk.UIColor.PrimaryBackground.text(),
			},
		},
	}
);
const myButton = desk.UIButton.with({
	onClick: "+Select",
	style: buttonStyle,
	label: "Selectable",
});
const view = desk.UISelectionController.with(
	desk.UIRow.with({ padding: 8, spacing: 8 }, myButton, myButton, myButton)
);
app.render(new view(), { mode: "page" });
