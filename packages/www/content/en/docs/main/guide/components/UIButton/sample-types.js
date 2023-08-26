const app = desk.useWebContext();
const view = desk.UICell.with(
	desk.UICenterRow.with(
		{ layout: { wrapContent: true } },
		desk.UIPrimaryButton.withLabel("Primary"),
		desk.UIOutlineButton.withLabel("Outline"),
		desk.UIBorderlessButton.withLabel("Borderless"),
		desk.UILinkButton.withLabel("Link"),
		desk.UIIconButton.withIcon(desk.UIIcon.Menu)
	)
);
app.render(new view(), { mode: "page" });
