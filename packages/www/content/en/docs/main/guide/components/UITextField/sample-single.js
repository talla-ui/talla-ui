const app = desk.useWebContext();
const view = desk.UIRow.with(
	{ padding: 8 },
	desk.UITextField.with({
		placeholder: "Enter text",
	})
);
app.render(new view(), { mode: "page" });
