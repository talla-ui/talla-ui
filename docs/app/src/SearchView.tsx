import { $activity, $list, UIStyle, ui } from "talla-ui";

const TextFieldStyle = ui.style.TEXTFIELD.extend(
	{
		background: ui.color.CLEAR,
		textColor: ui.color("inherit"),
		padding: { y: 4 },
		borderColor: ui.color.SEPARATOR,
		borderThickness: { bottom: 1 },
		borderRadius: 0,
		width: "100%",
	},
	{
		[UIStyle.STATE_FOCUSED]: true,
		borderColor: ui.color("var(--primary-boldest)"),
	},
);
const CloseButtonStyle = ui.style.BUTTON_ICON.extend(
	{
		background: ui.color.CLEAR,
		textColor: ui.color("inherit"),
	},
	{
		[UIStyle.STATE_HOVERED]: true,
		[UIStyle.STATE_DISABLED]: false,
		background: ui.color.CLEAR,
		textColor: ui.color("inherit"),
	},
);
const ResultCellStyle = ui.style.CELL.extend(
	{
		padding: { bottom: 8, x: 6 },
		borderThickness: 2,
		css: { cursor: "pointer" },
	},
	{
		[UIStyle.STATE_HOVERED]: true,
		background: ui.color("var(--nav-hover-background)"),
	},
	{
		[UIStyle.STATE_FOCUSED]: true,
		borderColor: ui.color("var(--primary-boldest)"),
		borderThickness: 2,
	},
);

export default (
	<cell style={{ shrink: 1 }}>
		<column layout={{ padding: { start: 16 } }}>
			<cell
				style={{
					height: 72,
					grow: 0,
					shrink: 0,
					padding: { start: 8, end: 12 },
				}}
			>
				<row>
					<textfield
						style={TextFieldStyle}
						requestFocus
						disableSpellCheck
						onInput="SearchInput"
						onArrowDownKeyPress="ArrowDownOnInput"
						onEnterKeyPress="GoToFirstResult"
					>
						Search...
					</textfield>
					<button
						style={CloseButtonStyle}
						icon={ui.icon.CLOSE}
						iconColor={ui.color("inherit")}
						onClick="Close"
					/>
				</row>
			</cell>
			<cell
				hidden={$activity("hasInput").and("loading").not()}
				padding={{ y: 32 }}
			>
				<label>Loading...</label>
			</cell>
			<cell>
				<scroll position={{ gravity: "cover" }}>
					<list items={$activity.list("results")} maxItems={50}>
						<cell
							allowFocus
							style={ResultCellStyle}
							onClick="GoToResult"
							onEnterKeyPress="GoToResult"
							onArrowUpKeyPress="FocusPrevious"
							onArrowDownKeyPress="FocusNext"
							accessibleRole="listitem"
						>
							<column align="start">
								<row>
									<label
										style={{ fontWeight: "var(--bold-weight)", shrink: 0 }}
									>
										{$list.string("item.title")}
									</label>
									<label dim>{$list.string("item.showId")}</label>
								</row>
								<label style={{ padding: 0, fontSize: 14 }} htmlFormat>
									{$list.string("item.abstract")}
								</label>
							</column>
						</cell>
						<cell
							style={{ grow: 0 }}
							allowKeyboardFocus
							accessibleRole="list"
						/>
					</list>
				</scroll>
			</cell>
		</column>
	</cell>
);
