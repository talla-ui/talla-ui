const app = desk.useWebContext();
const view = desk.UICell.with(
	desk.UIOutlineButton.with({
		label: "Button",
		icon: "@Plus",
	})
);
app.render(new view(), { mode: "page" });
