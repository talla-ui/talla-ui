import {
	app,
	Binding,
	BindingOrValue,
	ObservableEvent,
	ObservableList,
	ObservableObject,
	UI,
	UIListViewEvent,
	ViewBuilder,
	Widget,
} from "@talla-ui/core";
import { StringConvertible } from "@talla-ui/util";
import icons from "../icons";
import { getViewForElement } from "../ViewPickerPanel/ViewPickerPanelView";

class InspectableObjectItem extends ObservableObject {
	label?: string;
	object?: unknown;
}

class FoldViewComponent extends Widget {
	title: StringConvertible = "";
	folded = false;
	onToggleFold() {
		this.folded = !this.folded;
	}
}

function FoldView(title: StringConvertible, folded?: boolean) {
	let content: ViewBuilder[] = [];
	return FoldViewComponent.builder((v) =>
		UI.Column(
			UI.Row(
				UI.Text(v.bind("title"))
					.bold()
					.icon(v.bind("folded").then("chevronNext", "chevronDown")),
			)
				.cursor("pointer")
				.padding({ x: 6, y: 8 })
				.onClick("ToggleFold"),
			UI.Divider().lineColor(UI.colors.text.alpha(0.3)).margin(0),
			UI.ShowUnless(v.bind("folded"), UI.Column(...content).stretch()),
		),
	).extend(
		{
			with(...c: ViewBuilder[]) {
				content.push(...c);
				return this;
			},
		},
		(builder) => {
			builder.initializer.set("title", title);
			builder.initializer.set("folded", folded ?? false);
		},
	);
}

class InfoDetailRowComponent extends Widget {
	value: unknown;
}

function InfoDetailRow(label: StringConvertible, chevron?: boolean) {
	return InfoDetailRowComponent.builder((v) =>
		UI.Row()
			.padding({ x: 8, y: 4 })
			.height(32)
			.cursor("pointer")
			.border({ bottom: 1 }, "divider")
			.with(
				UI.Text(label).hideWhen(!label).width(120).fontSize(12),
				UI.Text(v.bind("value")).fontSize(12).grow(),
				UI.Image(UI.icons.chevronNext).size(20).hideWhen(!chevron),
			),
	).extend({
		value(value: BindingOrValue<unknown>) {
			this.initializer.set("value", value);
			return this;
		},
		onClick(
			handle:
				| string
				| ((e: ObservableEvent, row: InfoDetailRowComponent) => void),
		) {
			this.initializer.on("Click", handle);
			return this;
		},
	});
}

const ViewBody = (v: Binding<IndexPanelView>) =>
	UI.Column(
		UI.Row(UI.Text("Inspector").fontSize(16).bold().padding()),

		FoldView("Log").with(
			UI.Row(
				UI.Button().icon(icons.console).style("icon"),
				UI.Text()
					.fmt(
						"{} message{0:+//s}, {} error{1:+//s}",
						new Binding("log.numMessages"), // from MainOverlayView
						new Binding("log.numErrors"), // from MainOverlayView
					)
					.fontSize(12),
			)
				.padding(4)
				.cursor("pointer")
				.onClick("ShowConsole"),
		),
		FoldView("Activities").with(
			UI.List(v.bind("activities"), (item) =>
				InfoDetailRow("", true)
					.value(item.bind("label"))
					.onClick("InspectActivity"),
			),
		),
		FoldView("Views").with(
			UI.List(v.bind("views"), (item) =>
				InfoDetailRow("", true)
					.value(item.bind("label"))
					.onClick("InspectView"),
			),
		),
		FoldView("Navigation", true).with(
			UI.Column(
				InfoDetailRow("Path")
					.value(v.bind("navigation.path"))
					.onClick("ShowNavigation"),
			),
		),
		FoldView("Viewport", true).with(
			UI.Column(
				InfoDetailRow("Width").value(v.bind("viewport.width")),
				InfoDetailRow("Height").value(v.bind("viewport.height")),
				InfoDetailRow("Aspect").value(
					v.bind("viewport.portrait").then("Portrait", "Landscape"),
				),
				InfoDetailRow("Cols").value(v.bind("viewport.cols")),
				InfoDetailRow("Rows").value(v.bind("viewport.rows")),
				InfoDetailRow("Mode").value(
					v.bind("viewport.prefersDark").then("Dark", "Light"),
				),
			),
		),

		UI.Column()
			.effect("drag-modal", true)
			.hideWhen(
				new Binding("docked"), // from MainOverlayView
			)
			.stretch()
			.center(),
	)
		.gap(8)
		.grow()
		.scroll();

export class IndexPanelView extends Widget {
	protected override get body() {
		return ViewBody(Binding.from(this)).build();
	}

	navigation = app.navigation;
	viewport = app.viewport;
	activities = new ObservableList<InspectableObjectItem>();
	views = new ObservableList<InspectableObjectItem>();

	protected override beforeRender() {
		let updateInterval = setInterval(() => {
			if (this.isUnlinked()) {
				clearInterval(updateInterval);
				return;
			}
			this._updateViews();
			this._updateActivities();
		}, 1000);
		this._updateActivities();
		setTimeout(() => {
			this._updateViews();
		}, 10);
	}

	protected onShowNavigation() {
		this.emit("InspectObject", { object: this.navigation });
	}

	protected onInspectView(e: UIListViewEvent<InspectableObjectItem>) {
		let item = e.data.listViewItem;
		this.emit("InspectObject", { object: item?.object });
	}

	protected onInspectActivity(e: UIListViewEvent<InspectableObjectItem>) {
		let item = e.data.listViewItem;
		this.emit("InspectObject", { object: item?.object });
	}

	private _updateActivities() {
		let active: InspectableObjectItem[] = [];
		let inactive: InspectableObjectItem[] = [];
		for (let activity of app.activities.toArray()) {
			let label = `<${activity.constructor.name}>`;
			if (activity.isActive()) label += " (Active)";
			if (activity.navigationPath) {
				label += ` /${activity.navigationPath}`;
			}
			if (activity.title) {
				label += " " + JSON.stringify(activity.title);
			}
			let item =
				this.activities.find((i) => i.object === activity) ||
				Object.assign(new InspectableObjectItem(), {
					label: activity.constructor.name,
					object: activity,
				});
			item.label = label;
			if (activity.isActive()) active.push(item);
			else inactive.push(item);
		}
		this.activities.replaceAll([...active, ...inactive]);
	}

	private _updateViews() {
		let rootElts = Array.from(document.body.children);
		let items: InspectableObjectItem[] = [];
		for (let root of rootElts) {
			let innerElts = Array.from(root.children);
			if (/WEB-HANDLER/.test(String(root.nodeName))) {
				innerElts = innerElts.map((elt) => elt.firstElementChild!);
			}
			for (let inner of innerElts) {
				let view = getViewForElement(inner);
				if (view) {
					let label = `<${view.constructor.name}>`;
					if ("name" in view && view.name) {
						if (/WebTools/.test(view.name as string)) continue;
						label += " " + view.name;
					}
					let parentObject = ObservableObject.whence(view);
					if (parentObject) {
						label += ` (${parentObject.constructor.name})`;
					}
					let item =
						this.views.find((i) => i.object === view) ||
						Object.assign(new InspectableObjectItem(), { label, object: view });
					item.label = label;
					items.push(item);
				}
			}
		}
		this.views.replaceAll(items);
	}
}
