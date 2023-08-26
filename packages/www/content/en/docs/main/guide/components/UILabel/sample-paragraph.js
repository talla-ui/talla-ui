const app = desk.useWebContext();
const view = desk.UICell.with(
	desk.UIRow.with(
		{ padding: 8 },
		desk.UIParagraph.with({
			text:
				"This is a paragraph. " +
				"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam dapibus laoreet libero volutpat pharetra. Etiam egestas est leo, sed interdum tellus finibus ut. Ut a nisl et magna vehicula feugiat id vitae urna.",
		})
	)
);
app.render(new view(), { mode: "page" });
