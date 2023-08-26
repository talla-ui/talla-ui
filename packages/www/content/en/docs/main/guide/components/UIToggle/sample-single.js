const app = desk.useWebContext();
const view = desk.UICell.with(
	desk.UIRow.with(
		{ padding: 8 },
		desk.UILabel.withText("Checkbox:"),
		desk.UIToggle.with({
			label: "I accept the terms and conditions",
			state: true,
		})
	)
);
app.render(new view(), { mode: "page" });
