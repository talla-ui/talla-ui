import { UIStyle, bound, ui } from "@desk-framework/frame-core";

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
		borderColor: ui.color.PRIMARY,
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
		borderColor: ui.color.PRIMARY,
		borderThickness: 2,
	},
);

export default (
	<mount id="docpage-search">
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
					hidden={bound.boolean("!hasInput").or("!loading")}
					padding={{ y: 32 }}
				>
					<label>Loading...</label>
				</cell>
				<cell>
					<scroll position={{ gravity: "cover" }}>
						<list items={bound.list("results")} maxItems={50}>
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
										<label style={{ fontWeight: 500, shrink: 0 }}>
											{bound.string("item.title")}
										</label>
										<label dim>{bound.string("item.showId")}</label>
									</row>
									<label style={{ padding: 0, fontSize: 14 }} htmlFormat>
										{bound.string("item.abstract")}
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
	</mount>
);
