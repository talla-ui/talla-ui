const app = desk.useWebContext();
const months = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];
const view = desk.UICell.with(
	{ padding: 8 },
	desk.UIScrollContainer.with(
		{
			dimensions: { width: 300, height: 180, grow: 0, shrink: 0 },
			position: { gravity: "center" },
		},
		desk.UIList.with(
			{ items: months },
			desk.UIRow.with(desk.UILabel.withText(desk.bound.string("item")))
		)
	)
);
app.render(new view(), { mode: "page" });
