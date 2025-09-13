import { bind, UI, UIColor, UIStyle } from "talla-ui";

const TextFieldStyle = UI.styles.textfield.default
	.extend({
		background: UI.colors.transparent,
		textColor: new UIColor("inherit"),
		padding: { y: 4 },
		borderColor: UI.colors.divider,
		borderWidth: { bottom: 1 },
		borderRadius: 0,
		width: "100%",
	})
	.setFocused({
		borderColor: new UIColor("var(--accent-boldest)"),
	});

const CloseButtonStyle = UI.styles.button.icon
	.extend({
		background: UI.colors.transparent,
		textColor: new UIColor("inherit"),
	})
	.setHovered({
		background: UI.colors.transparent,
		textColor: new UIColor("inherit"),
	});

const ResultCellStyle = new UIStyle({
	padding: { x: 6, y: 4 },
	borderWidth: 2,
	css: { cursor: "pointer" },
})
	.setHovered({
		background: new UIColor("var(--nav-hover-background)"),
	})
	.setFocused({
		borderColor: new UIColor("var(--accent-boldest)"),
		borderWidth: 2,
	});

export function SearchView() {
	return UI.Cell()
		.padding({ start: 16 })
		.width("100%")
		.grow(false)
		.shrink(true)
		.handleKey("Escape", "Close")
		.with(
			UI.Row()
				.height(72)
				.padding({ start: 8, end: 12 })
				.with(
					UI.TextField("Search...")
						.textfieldStyle(TextFieldStyle)
						.requestFocus()
						.disableSpellCheck()
						.onInput("SearchInput")
						.handleKey("ArrowDown", "ArrowDownOnInput")
						.handleKey("Enter", "GoToFirstResult"),
					UI.Button()
						.icon(UI.icons.close)
						.buttonStyle(CloseButtonStyle)
						.onClick("Close"),
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
						.onClick("GoToResult")
						.handleKey("Enter", "GoToResult")
						.handleKey("ArrowUp", "FocusPrevious")
						.handleKey("ArrowDown", "FocusNext")
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
