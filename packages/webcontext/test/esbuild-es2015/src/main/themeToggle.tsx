import {
	JSX,
	UIButtonStyle,
	UIColor,
	UITheme,
	bound,
} from "../../../../lib/desk-framework-web.es2015.esm.min";

const ToggleButtonStyle = UIButtonStyle.extend(
	{
		borderRadius: 0,
		minWidth: 80,
	},
	{
		[UITheme.STATE_PRESSED]: true,
		[UITheme.STATE_DISABLED]: false,
		background: UIColor["@primary"],
		textColor: UIColor["@primary"].text(),
	},
	{
		[UITheme.STATE_PRESSED]: true,
		[UITheme.STATE_HOVERED]: true,
		[UITheme.STATE_DISABLED]: false,
		background: UIColor["@primary"].contrast(0.1),
	},
);

export default (
	<cell
		cellStyle={{ borderRadius: 16, grow: 0 }}
		layout={{ axis: "horizontal" }}
		position={{ gravity: "center" }}
	>
		<button
			label="Light"
			value="light"
			pressed={bound("selectedTheme").matches("light")}
			buttonStyle={ToggleButtonStyle}
			onMouseDown="+SetTheme"
		/>
		<button
			label="Dark"
			value="dark"
			pressed={bound("selectedTheme").matches("dark")}
			buttonStyle={ToggleButtonStyle}
			onMouseDown="+SetTheme"
		/>
	</cell>
);
