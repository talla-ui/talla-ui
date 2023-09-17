const app = desk.useWebContext();
const view = desk.UICell.with(
	desk.UIOutlineButton.with({
		label: "Button",
		icon: "@plus",
	}),
);
app.render(new view(), { mode: "page" });
