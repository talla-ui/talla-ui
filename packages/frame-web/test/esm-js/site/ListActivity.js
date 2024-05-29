import {
	$activity,
	$list,
	$view,
	Activity,
	ManagedList,
	ManagedRecord,
	StringConvertible,
	UIFormContext,
	UITextField,
	ViewComposite,
	ui,
} from "./lib/desk-framework-web.es2018.esm.min.js";

class ListItem extends ManagedRecord {
	text = "";
}

const ListItemView = ViewComposite.define(
	{ text: StringConvertible.EMPTY, selected: false },
	ui.cell(
		{
			background: ui.color.BACKGROUND,
			effect: ui.effect.SHADOW,
			borderRadius: 4,
			style: $view
				.boolean("selected")
				.select(
					{ borderThickness: 1, borderColor: ui.color.TEXT },
					{ borderThickness: 1, borderColor: ui.color.CLEAR },
				),
			padding: { x: 12, y: 4 },
			allowKeyboardFocus: true,
			onFocusIn: "+SelectItem",
			onArrowDownKeyPress: "+FocusNext",
			onArrowUpKeyPress: "+FocusPrevious",
		},
		ui.row(
			ui.label({ text: $view.string("text"), style: { grow: 1 } }),
			ui.button({
				hidden: $view.not("selected"),
				icon: ui.icon.CLOSE,
				style: ui.style.BUTTON_ICON,
				onClick: "RemoveItem",
			}),
		),
	),
);

const page = ui.page(
	ui.cell(
		{ padding: 16 },
		ui.column(
			{ width: 400, position: { gravity: "center" } },
			ui.row(
				{
					accessibleRole: "form",
					accessibleLabel: "New item form",
					onSubmit: "+AddItem",
				},
				ui.textField({
					formField: "text",
					style: { grow: 1 },
					requestFocus: true,
				}),
				ui.button("Add", "Submit", ui.style.BUTTON_PRIMARY),
			),
			ui.spacer(0, 8),
			ui.list(
				{ items: $activity.list("items") },
				ui.use(ListItemView, {
					text: $list.string("item.text"),
					selected: $activity.bind("selectedItem").equals($list.bind("item")),
				}),
				ui.column({ spacing: 8, accessibleRole: "list" }),
			),
		),
	),
);

export class ListActivity extends Activity {
	createView() {
		return new page();
	}

	formContext = new UIFormContext({ text: "" });

	items = this.attach(new ManagedList().restrict(ListItem));
	selectedItem = undefined;

	onAddItem() {
		if (!this.formContext.values.text) return;
		this.items.insert(
			ListItem.create({ text: this.formContext.values.text }),
			this.items.first(),
		);
		this.formContext.clear();
		this.findViewContent(UITextField)[0]?.requestFocus();
	}

	onSelectItem(e) {
		this.selectedItem = e.delegate.item;
	}

	onRemoveItem(e) {
		this.items.remove(e.delegate.item);
	}
}
