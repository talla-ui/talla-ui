import { Binding, UI, UIColor } from "talla-ui";
import { SearchActivity } from "./SearchActivity";

export function SearchView(v: Binding<SearchActivity>) {
	return UI.Cell()
		.padding({ start: 16, end: 8 })
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
						.style({
							background: UI.colors.transparent,
							textColor: new UIColor("inherit"),
							padding: { y: 4 },
							borderColor: UI.colors.divider,
							borderWidth: { bottom: 1 },
							borderRadius: 0,
							width: "100%",
						})
						.onFocusIn((_, tf) =>
							tf.setStyle({
								borderColor: new UIColor("var(--accent-boldest)"),
							}),
						)
						.onFocusOut((_, tf) =>
							tf.setStyle({
								borderColor: UI.colors.divider,
							}),
						)
						.requestFocus()
						.disableSpellCheck()
						.onInput("SearchInput")
						.handleKey("ArrowDown", "ArrowDownOnInput")
						.handleKey("Enter", "GoToFirstResult"),
					UI.Button().icon(UI.icons.close).style("text").onClick("Close"),
				),
			UI.Cell()
				.hideWhen(v.bind("hasInput").and("loading").not())
				.padding({ y: 32 })
				.with(UI.Text("Loading...")),
			UI.List(v.bind("results"))
				.bounds(0, 50)
				.outer(UI.Cell().grow(false).allowKeyboardFocus().scroll())
				.with((item) =>
					UI.Cell()
						.allowFocus()
						.padding({ x: 6, y: 4 })
						.border(2, UI.colors.transparent)
						.cursor("pointer")
						.onFocusIn((_, cell) =>
							cell.setStyle({
								borderColor: new UIColor("var(--accent-boldest)"),
							}),
						)
						.onFocusOut((_, cell) =>
							cell.setStyle({
								borderColor: UI.colors.transparent,
							}),
						)
						.onMouseEnter((_, cell) =>
							cell.setStyle({
								background: new UIColor("var(--menu-hover-background)"),
							}),
						)
						.onMouseLeave((_, cell) =>
							cell.setStyle({
								background: UI.colors.transparent,
							}),
						)
						.onClick("GoToResult")
						.handleKey("Enter", "GoToResult")
						.handleKey("ArrowUp", "FocusPrevious")
						.handleKey("ArrowDown", "FocusNext")
						.with(
							UI.Column().with(
								UI.Row(
									UI.Text(item.bind("title")).style({
										fontWeight: "var(--bold-weight)",
										shrink: 0,
									}),
									UI.Text(item.bind("showId")).dim().fontSize(14),
								),
								UI.Text().html(item.bind("abstract")).padding(0).fontSize(14),
							),
						),
				),
		);
}
