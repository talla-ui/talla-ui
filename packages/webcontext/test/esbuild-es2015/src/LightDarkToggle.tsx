import {
	JSX,
	UIColor,
	UIStyle,
	ViewComposite,
} from "../../../lib/desk-framework-web.es2015.esm.min";

const switchButtonStyle = UIStyle.OutlineButton.extend(
	{},
	{
		selected: {
			decoration: {
				background: UIColor.Primary,
				textColor: UIColor.Primary.text(),
			},
		},
	},
);

export default ViewComposite.define(
	<selection>
		<row>
			<outlinebutton
				style={switchButtonStyle}
				onClick="Select"
				onSelect="+SetLightMode"
			>
				Light
			</outlinebutton>
			<outlinebutton
				style={switchButtonStyle}
				onClick="Select"
				onSelect="+SetDarkMode"
			>
				Dark
			</outlinebutton>
		</row>
	</selection>,
);
