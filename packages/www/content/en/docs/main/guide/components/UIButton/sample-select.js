const app = desk.useWebContext();
const buttonStyle = desk.UIButtonStyle.extend({
	[desk.UITheme.STATE_SELECTED]: true,
	background: desk.UIColor["@primaryBackground"],
	textColor: desk.UIColor["@primaryBackground"].text(),
});
const myButton = desk.UIButton.with({
	buttonStyle: buttonStyle,
	label: "Selectable",
	onClick: "+Select",
});
const view = desk.UISelectionController.with(
	desk.UIRow.with({ padding: 8, spacing: 8 }, myButton, myButton, myButton),
);
app.render(new view(), { mode: "page" });
