import {
	UIStyle,
	bound,
	ui,
} from "../../../../lib/desk-framework-web.es2015.esm.min";

const ToggleButtonStyle = ui.style.BUTTON.extend(
	{
		borderRadius: 0,
		minWidth: 80,
	},
	{
		[UIStyle.STATE_PRESSED]: true,
		[UIStyle.STATE_DISABLED]: false,
		background: ui.color.PRIMARY,
		textColor: ui.color.PRIMARY.text(),
	},
	{
		[UIStyle.STATE_PRESSED]: true,
		[UIStyle.STATE_HOVERED]: true,
		[UIStyle.STATE_DISABLED]: false,
		background: ui.color.PRIMARY.contrast(0.1),
	},
);

export default (
	<row>
		<button chevron="down" onClick="ZoomMenu">
			Zoom
		</button>
		<cell style={{ borderRadius: 16, grow: 0 }}>
			<row spacing={0}>
				<button
					label="Light"
					value="light"
					pressed={bound("selectedTheme").matches("light")}
					style={ToggleButtonStyle}
					onPress="+SetTheme"
				/>
				<button
					label="Dark"
					value="dark"
					pressed={bound("selectedTheme").matches("dark")}
					style={ToggleButtonStyle}
					onPress="+SetTheme"
				/>
			</row>
		</cell>
	</row>
);
