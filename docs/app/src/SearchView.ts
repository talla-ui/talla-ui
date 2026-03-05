import { Binding, UI, UIColor } from "talla-ui";
import { SearchActivity } from "./SearchActivity";

export function SearchView(v: Binding<SearchActivity>) {
	return UI.Column()
		.padding({ start: 16, end: 8 })
		.width("100%")
		.flex(0, 1)
		.onKey("Escape", "Close")
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
						.onKey("ArrowDown", "ArrowDownOnInput")
						.onKey("Enter", "GoToFirstResult"),
					UI.Button().icon(UI.icons.close).plain().onClick("Close"),
				),
			UI.Column()
				.hideWhen(Binding.all(v.bind("hasInput"), "loading").not())
				.padding({ y: 32 })
				.with(UI.Text("Loading...")),
			UI.List(v.bind("results"))
				.bounds(0, 50)
				.outer(UI.Column().allowKeyboardFocus().scroll())
				.with((item) =>
					UI.Column()
						.allowFocus()
						.padding({ x: 6, y: 4 })
						.border(2, UI.colors.transparent)
						.cursor("pointer")
						.onFocusIn((_, col) =>
							col.setStyle({
								borderColor: new UIColor("var(--accent-boldest)"),
							}),
						)
						.onFocusOut((_, col) =>
							col.setStyle({
								borderColor: UI.colors.transparent,
							}),
						)
						.onMouseEnter((_, col) =>
							col.setStyle({
								background: new UIColor("var(--menu-hover-background)"),
							}),
						)
						.onMouseLeave((_, col) =>
							col.setStyle({
								background: UI.colors.transparent,
							}),
						)
						.onClick("GoToResult")
						.onKey("Enter", "GoToResult")
						.onKey("ArrowUp", "FocusPrevious")
						.onKey("ArrowDown", "FocusNext")
						.with(
							UI.Column().with(
								UI.Row(
									UI.Text(item.bind("title")).style({
										fontWeight: "var(--bold-weight)",
									}),
									UI.Text(item.bind("showId")).dim().fontSize(14),
								).gap(8),
								UI.Text().html(item.bind("abstract")).padding(0).fontSize(14),
							),
						),
				),
		);
}
