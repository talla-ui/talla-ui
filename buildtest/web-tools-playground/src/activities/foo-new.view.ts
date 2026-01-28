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
					UI.Text("New item").style("title"),
					UI.Spacer(),
					UI.Button().icon(UI.icons.close).style("icon").onClick("Cancel"),
				),
			UI.Spacer(16),

			UI.Column()
				.gap(4)
				.with(
					UI.Text("Name").dim().onPress("RequestFocusNext"),
					UI.TextField().formStateValue(v.bind("form"), "title").requestFocus(),
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

			UI.ShowWhen(v.bind("showAsPage"), UI.Spacer(32), UI.Divider().margin(24)),

			UI.Row()
				.align("end")
				.hideWhen(v.bind("showAsPage"))
				.with(
					UI.Button("Save").style("accent").onClick("Save"),
					UI.Button("Cancel").onClick("Cancel"),
				),

			UI.Column()
				.gap(8)
				.hideWhen(v.bind("showAsPage").not())
				.with(
					UI.Button("Save").style("accent").onClick("Save"),
					UI.Button("Cancel").onClick("Cancel"),
				),
		);
