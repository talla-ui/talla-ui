const DangerousButtonStyle = desk.UIPrimaryButtonStyle.extend(
	{
		background: desk.UIColor["@red"],
	},
	{
		[desk.UITheme.STATE_HOVERED]: true,
		[desk.UITheme.STATE_DISABLED]: false,
		background: desk.UIColor["@red"].brighten(-0.2),
		borderColor: desk.UIColor["@red"].brighten(-0.2),
	},
	{
		[desk.UITheme.STATE_PRESSED]: true,
		[desk.UITheme.STATE_DISABLED]: false,
		background: desk.UIColor["@red"].brighten(0.2),
	},
);

const app = desk.useWebContext();
const view = desk.UICell.with(
	desk.UICenterRow.with(
		desk.UIPrimaryButton.with({
			label: "Delete",
			buttonStyle: DangerousButtonStyle,
		}),
	),
);
app.render(new view(), { mode: "page" });
