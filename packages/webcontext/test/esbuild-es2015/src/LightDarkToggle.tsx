import {
	JSX,
	UIButtonStyle,
	UIColor,
	UITheme,
	ViewComposite,
} from "../../../lib/desk-framework-web.es2015.esm.min";

const SwitchButtonStyle = UIButtonStyle.extend(
	{
		[UITheme.STATE_SELECTED]: true,
		background: UIColor["@primary"],
		textColor: UIColor["@primary"].text(),
	},
	{
		[UITheme.STATE_SELECTED]: true,
		[UITheme.STATE_HOVERED]: true,
		background: UIColor["@primary"].contrast(0.1),
	},
);

export default ViewComposite.define(
	<selection>
		<row>
			<button
				buttonStyle={SwitchButtonStyle}
				onClick="Select"
				onSelect="+SetLightMode"
			>
				Light
			</button>
			<button
				buttonStyle={SwitchButtonStyle}
				onClick="Select"
				onSelect="+SetDarkMode"
			>
				Dark
			</button>
		</row>
	</selection>,
);
