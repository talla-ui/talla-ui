const app = desk.useWebContext();
const view = desk.UICell.with(
	desk.UIImage.with({
		url: "/assets/logo.png",
		dimensions: { maxHeight: 80 },
		decoration: { dropShadow: 0.5 },
	})
);
app.render(new view(), { mode: "page" });
