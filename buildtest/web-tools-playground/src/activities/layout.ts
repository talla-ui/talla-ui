import {
	Binding,
	StringConvertible,
	UI,
	UIIconResource,
	ViewBuilder,
} from "talla-ui";

export function NavButton(
	page: string,
	title: StringConvertible,
	icon?: UIIconResource,
) {
	return UI.Button(title)
		.navigateTo(page)
		.icon(icon, { margin: 16 })
		.pressed(
			new Binding("appContext.navigation.path").map(
				(path) => String(path).replace(/\/.*/, "") === page,
			),
		)
		.ghost()
		.padding({ y: 8, x: 16 })
		.cursor("pointer")
		.textAlign("start");
}

export function MobileNavButton(
	page: string,
	title: StringConvertible,
	icon?: UIIconResource,
) {
	return UI.Button(title)
		.navigateTo(page)
		.icon(icon, { position: "top" })
		.pressed(
			new Binding("appContext.navigation.path").map(
				(path) => String(path).replace(/\/.*/, "") === page,
			),
		)
		.background("transparent")
		.minWidth(80);
}

export function MainLayout(...content: ViewBuilder[]) {
	return UI.Row()
		.background("shade")
		.position("cover")
		.flex(0, 1)
		.with(
			// Left nav for wide screens
			UI.Column()
				.width(300)
				.position("start")
				.padding({ y: 32, x: 8 })
				.gap(8)
				.hideWhen(UI.viewport.cols.lt(3))
				.with(
					UI.Text("Playground").bold().fontSize(16).padding({ x: 8 }),
					UI.Spacer(0, 32),
					NavButton("foo", "Foo", new UIIconResource("🐘")),
					NavButton("bar", "Bar", new UIIconResource("🐝")),
				),

			// Main content column
			UI.Column()
				.flex()
				.gravity("center")
				.background("background")
				.borderRadius(8)
				.with(...content)
				.scroll(),

			// Bottom nav for narrow screens
			UI.Column()
				.hideWhen(UI.viewport.cols.gt(2))
				.background("background")
				.position("overlay", "auto", 0, 0, 0)
				.centerContent()
				.with(
					UI.Divider(),
					UI.Row()
						.distribute("center")
						.gap(8)
						.padding(8)
						.with(
							MobileNavButton("foo", "Foo", new UIIconResource("🐘")),
							MobileNavButton("bar", "Bar", new UIIconResource("🐝")),
						),
				),
		);
}
