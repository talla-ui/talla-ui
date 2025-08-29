import { bind, UI, UIColor, UIStyle } from "talla-ui";

const TextFieldStyle = UI.styles.textfield.default.extend(
	{
		background: UI.colors.transparent,
		textColor: new UIColor("inherit"),
		padding: { y: 4 },
		borderColor: UI.colors.divider,
		borderWidth: { bottom: 1 },
		borderRadius: 0,
		width: "100%",
	},
	{
		[UIStyle.STATE_FOCUSED]: true,
		borderColor: new UIColor("var(--primary-boldest)"),
	},
);
const CloseButtonStyle = UI.styles.button.icon.extend(
	{
		background: UI.colors.transparent,
		textColor: new UIColor("inherit"),
	},
	{
		[UIStyle.STATE_HOVERED]: true,
		background: UI.colors.transparent,
		textColor: new UIColor("inherit"),
	},
);
const ResultCellStyle = new UIStyle(
	{
		padding: { x: 6, y: 4 },
		borderWidth: 2,
		css: { cursor: "pointer" },
	},
	{
		[UIStyle.STATE_HOVERED]: true,
		background: new UIColor("var(--nav-hover-background)"),
	},
	{
		[UIStyle.STATE_FOCUSED]: true,
		borderColor: new UIColor("var(--primary-boldest)"),
		borderWidth: 2,
	},
);

// export default (
// 	<cell padding={{ start: 16 }}>
// 		<cell
// 			style={{
// 				height: 72,
// 				grow: 0,
// 				shrink: 0,
// 				padding: { start: 8, end: 12 },
// 			}}
// 		>
// 			<row>
// 				<textfield
// 					style={TextFieldStyle}
// 					requestFocus
// 					disableSpellCheck
// 					onInput="SearchInput"
// 					onArrowDownKeyPress="ArrowDownOnInput"
// 					onEnterKeyPress="GoToFirstResult"
// 				>
// 					Search...
// 				</textfield>
// 				<button
// 					style={CloseButtonStyle}
// 					icon={ui.icon.CLOSE}
// 					iconColor={ui.color("inherit")}
// 					onClick="Close"
// 				/>
// 			</row>
// 		</cell>
// 		<cell
// 			hidden={$activity("hasInput").and("loading").not()}
// 			padding={{ y: 32 }}
// 		>
// 			<label>Loading...</label>
// 		</cell>
// 		<cell>
// 			<scroll position={{ gravity: "cover" }}>
// 				<list items={$activity("results")} maxItems={50}>
// 					<cell
// 						allowFocus
// 						style={ResultCellStyle}
// 						onClick="GoToResult"
// 						onEnterKeyPress="GoToResult"
// 						onArrowUpKeyPress="FocusPrevious"
// 						onArrowDownKeyPress="FocusNext"
// 						accessibleRole="listitem"
// 					>
// 						<column align="start">
// 							<row>
// 								<label style={{ fontWeight: "var(--bold-weight)", shrink: 0 }}>
// 									{$list("item.title")}
// 								</label>
// 								<label dim>{$list("item.showId")}</label>
// 							</row>
// 							<label style={{ padding: 0, fontSize: 14 }} htmlFormat>
// 								{$list("item.abstract")}
// 							</label>
// 						</column>
// 					</cell>
// 					<cell style={{ grow: 0 }} allowKeyboardFocus accessibleRole="list" />
// 				</list>
// 			</scroll>
// 		</cell>
// 	</cell>
// );

export function SearchView() {
	return UI.Cell()
		.padding({ start: 16 })
		.width("100%")
		.grow(false)
		.shrink(true)
		.with(
			UI.Row()
				.height(72)
				.padding({ start: 8, end: 12 })
				.with(
					UI.TextField("Search...")
						.textfieldStyle(TextFieldStyle)
						.requestFocus()
						.disableSpellCheck()
						.emit("SearchInput")
						.intercept("ArrowDownKeyPress", "ArrowDownOnInput")
						.intercept("EnterKeyPress", "GoToFirstResult"),
					UI.Button()
						.icon(UI.icons.close)
						.buttonStyle(CloseButtonStyle)
						.emit("Close"),
				),
			UI.Cell()
				.hideWhen(bind("hasInput").and("loading").not())
				.padding({ y: 32 })
				.with(UI.Label("Loading...")),
			UI.List(bind("results"))
				.bounds(0, 50)
				.outer(UI.Cell().grow(false).allowKeyboardFocus().scroll())
				.with(
					UI.Cell()
						.allowFocus()
						.style(ResultCellStyle)
						.intercept("Click", "GoToResult")
						.intercept("EnterKeyPress", "GoToResult")
						.intercept("ArrowUpKeyPress", "FocusPrevious")
						.intercept("ArrowDownKeyPress", "FocusNext")
						.with(
							UI.Column().with(
								UI.Row(
									UI.Label(bind("item.title")).labelStyle({
										fontWeight: "var(--bold-weight)",
										shrink: 0,
									}),
									UI.Label(bind("item.showId")).dim().fontSize(14),
								),
								UI.Label().html(bind("item.abstract")).padding(0).fontSize(14),
							),
						),
				),
		);
}
