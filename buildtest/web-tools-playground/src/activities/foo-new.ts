import { Activity, FormState, ObservableObject, app } from "talla-ui";
import { FooItem } from "./foo";
import { FooNewView } from "./foo-new.view";

export class NewFooActivity extends Activity {
	static View = FooNewView;

	showAsPage = (app.viewport?.cols || 1) < 3;

	item?: FooItem;

	form = new FormState(
		(v) =>
			v.object({
				title: v.string().required("Title is required"),
				quantity: v.coerce
					.number()
					// .int() // FIXME
					.required("Quantity is required")
					.check((n) => n > 0)
					.error("Quantity must be positive"),
			}),
		{ quantity: 1 },
	);

	protected async afterActive(signal: AbortSignal) {
		console.log("Showing as page?", this.showAsPage);
		this.setRenderMode(this.showAsPage ? "page" : "dialog");
	}

	protected onSave() {
		let values = this.form.validate();
		if (!values) {
			app.showAlertDialogAsync("Please correct your inputs");
			return;
		}
		let { title, quantity } = values;
		let weight = Math.floor(Math.random() * 100);
		this.item = Object.assign(new ObservableObject(), {
			title,
			quantity,
			weight,
			total: quantity * weight,
		});
		this.unlink();
	}

	protected onCancel() {
		this.item = undefined;
		this.unlink();
	}
}
