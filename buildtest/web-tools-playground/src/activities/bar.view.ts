import { Binding, UI } from "talla-ui";
import { MainLayout } from "./layout";

const countNumberStyle = {
	textAlign: "center" as const,
	tabularNums: true,
	bold: true,
	padding: 16,
};

const countButtonStyle = {
	flexGrow: 1,
	width: 100,
	borderRadius: 0,
};

export function BarView(v: Binding<{ count: number }>) {
	return MainLayout(
		UI.Column()
			.padding(16)
			.width("100%", 0, 600)
			.position("center")
			.with(
				UI.Spacer(0, 40).hideWhen(UI.viewport.cols.gt(2)),

				UI.Row().height(48).with(UI.Text("Bar").bold().fontSize(20)),
				UI.Divider(),
				UI.Spacer(0, 32),

				UI.Column()
					.background(UI.colors.shade.contrast(-0.1))
					.effect("fade-slow")
					.borderRadius(16)
					.clip()
					.with(
						UI.Column()
							.height(200)
							.background("shade")
							.clip()
							.center()
							.with(UI.Image("https://picsum.photos/800/600")),
						UI.Row()
							.gap(0)
							.with(
								UI.Column()
									.flex()
									.center()
									.with(
										UI.Text(v.bind("count"))
											.fontSize(64)
											.style(countNumberStyle),
									),
								UI.Divider().vertical().margin(0),
								UI.Column()
									.position("stretch")
									.with(
										UI.Button()
											.icon(UI.icons.chevronUp)
											.style("ghost")
											.style(countButtonStyle)
											.onClick("IncrementCount"),
										UI.Button()
											.icon(UI.icons.chevronDown)
											.style("ghost")
											.style(countButtonStyle)
											.onClick("DecrementCount"),
									),
							),
					),
			),
	);
}
