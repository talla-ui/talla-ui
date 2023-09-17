const app = desk.useWebContext();
const view = desk.UICell.with(
	desk.UIRow.with(
		{ padding: 8 },
		desk.UILabel.with({
			text: "This is a label",
			icon: "@expandRight",
		}),
	),
);
app.render(new view(), { mode: "page" });
