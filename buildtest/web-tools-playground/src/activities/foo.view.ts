import { Binding, UI } from "talla-ui";
import { MainLayout } from "./layout";

export interface FooViewModel {
	items: Iterable<{ title: string }>;
}

export function FooView(v: Binding<FooViewModel>) {
	return MainLayout(
		UI.Column()
			.padding(16)
			.width("100%", 0, 600)
			.position("center")
			.with(
				UI.Spacer(0, 40).hideWhen(UI.viewport.cols.gt(2)),

				UI.Row()
					.height(48)
					.with(
						UI.Text("Foo").bold().fontSize(20),
						UI.Spacer(),
						UI.Button().icon(UI.icons.plus).style("icon").onClick("NewItem"),
					),
				UI.Divider(),
				UI.Spacer(0, 8),

				UI.Row().height(48).with(UI.Text("All items").bold()),
				UI.List(v.bind("items"), (item) =>
					UI.Row()
						.cursor("pointer")
						.onClick("GoToItem")
						.height(40)
						.padding({ start: 12, end: 8 })
						.with(
							UI.Text(item.bind("title")).flex(),
							UI.Image(UI.icons.chevronNext),
						),
				).outer(
					UI.Column()
						.divider(1, "background")
						.background("shade")
						.borderRadius(8),
				),

				UI.Spacer(0, 80).hideWhen(UI.viewport.cols.gt(2)),
			),
	);
}
