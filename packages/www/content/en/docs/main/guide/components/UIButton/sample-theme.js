const app = desk.useWebContext();
app.theme.styles = {
	...app.theme.styles,
	PrimaryButton: app.theme.styles.PrimaryButton.extend({
		textStyle: {
			bold: true,
			uppercase: true,
			fontSize: 12,
		},
		decoration: {
			padding: { x: 32, y: 8 },
			borderRadius: 0,
			dropShadow: 0.5,
		},
	}),
};
const view = desk.UICell.with(
	desk.UICenterRow.with(desk.UIPrimaryButton.withLabel("Primary"))
);
app.render(new view(), { mode: "page" });
