import { Binding, FormState, UI } from "talla-ui";

export interface FooNewViewModel {
	showAsPage: boolean;
	form: FormState;
}

export const FooNewView = (v: Binding<FooNewViewModel>) =>
	UI.Column()
		.position("center")
		.width(450, 0, "100%")
		.padding(
			v
				.bind("showAsPage")
				.then({ x: 12, top: 56 }, { x: 20, top: 8, bottom: 20 }),
		)
		.onKey("Enter", "Save")
		.with(
			UI.Row()
				.effect("drag-modal")
				.height(48)
				.with(
					UI.Text("New item").larger().bold(),
					UI.Spacer(),
					UI.IconButton(UI.icons.close).bare().onClick("Cancel"),
				),
			UI.Spacer(16),

			UI.Column()
				.gap(4)
				.with(
					UI.Text("Name").dim().onPress("RequestFocusNext"),
					UI.TextField()
						.formStateValue(v.bind("form"), "title")
						.invalid(v.bind("form.errors.title").then(true))
						.requestFocus(),
					UI.Text()
						.hideWhen(v.bind.not("form.errors.title"))
						.text(v.bind("form.errors.title"))
						.textColor("danger"),
				),
			UI.Spacer(16),
			UI.Column()
				.gap(4)
				.with(
					UI.Text("Quantity").dim().onPress("RequestFocusNext"),
					UI.TextField()
						.formStateValue(v.bind("form"), "quantity")
						.width(120)
						.type("numeric")
						.textAlign("end"),
					UI.Text()
						.hideWhen(v.bind.not("form.errors.quantity"))
						.text(v.bind("form.errors.quantity"))
						.textColor("danger"),
				),

			UI.ShowWhen(
				v.bind("showAsPage"),
				UI.Spacer(32),
				UI.Divider().margin({ y: 24 }),
			),

			UI.Row()
				.distribute("end")
				.gap(8)
				.hideWhen(v.bind("showAsPage"))
				.with(
					UI.Button("Save").accent().onClick("Save"),
					UI.Button("Cancel").onClick("Cancel"),
				),

			UI.Column()
				.gap(8)
				.hideWhen(v.bind("showAsPage").not())
				.with(
					UI.Button("Save").accent().onClick("Save"),
					UI.Button("Cancel").onClick("Cancel"),
				),
		);
