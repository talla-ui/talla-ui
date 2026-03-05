import { Binding, UI } from "talla-ui";
import type { FooItem } from "./foo";
import { MainLayout } from "./layout";

function StatsLine(label: string, value: any) {
	return UI.Row()
		.padding({ x: 16, y: 8 })
		.with(UI.Text(label).flex(), UI.Text(value));
}

export const FooDetailView = (v: Binding<{ item: FooItem }>) =>
	MainLayout(
		UI.Column()
			.padding(16)
			.width("100%", 0, 600)
			.position("center")
			.with(
				UI.Row(
					UI.Button("Back")
						.icon(UI.icons.chevronBack)
						.bare()
						.cursor("pointer")
						.position({ start: -4 })
						.onClick("NavigateBack")
						.effect("fade-top"),
				).height(40),

				UI.Row()
					.height(48)
					.with(UI.Text(v.bind("item.title")).larger().bold()),
				UI.Divider(),
				UI.Spacer(0, 8),

				UI.Row().height(48).with(UI.Text("Stats").bold()),
				UI.Column()
					.effect("pop")
					.background("shade")
					.maxWidth(300)
					.borderRadius(16)
					.padding(8)
					.with(
						StatsLine("Name", v.bind("item.title")),
						StatsLine("Weight", Binding.fmt("{:d} kg", v.bind("item.weight"))),
						StatsLine("Quantity", v.bind("item.quantity")),
						StatsLine(
							"Total weight",
							Binding.fmt("{:d} kg", v.bind("item.total")),
						),
					),
			),
	);
