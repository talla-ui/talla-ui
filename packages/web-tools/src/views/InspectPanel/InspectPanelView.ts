import {
	app,
	Binding,
	ObservableList,
	ObservableObject,
	UI,
	UIListViewEvent,
	UIScrollView,
	ViewEvent,
	Widget,
} from "@talla-ui/core";
import { PropertyInfo } from "../../PropertyInfo";
import icons from "../icons";

const MAX_ITEMS = 500;

const BodyView = (v: Binding<InspectPanelView>) =>
	UI.Column()
		.name("PropertyList")
		.layout({ distribution: "start", gravity: "stretch" })
		.flex()
		.with(
			UI.List(v.bind("history"), (item) =>
				UI.Column()
					.height(32)
					.padding({ x: 8, y: 4 })
					.background(
						Binding.equal(item.bind("value"), v.bind("object")).then(
							UI.colors.blue.mix(UI.colors.background, 0.75),
							UI.colors.background.contrast(-0.1).alpha(0.5),
						),
					)
					.border({ bottom: 1 }, UI.colors.text.alpha(0.5))
					.cursor("pointer")
					.onClick("HistoryClick")
					.onMouseEnter("HighlightEnter")
					.onMouseLeave("HighlightLeave")
					.with(
						UI.Row(
							UI.Image(
								Binding.equal(item.bind("value"), v.bind("object")).then(
									UI.icons.chevronDown,
									UI.icons.chevronNext,
								),
							),
							UI.Text(item.bind("key").string(".{}"))
								.hideWhen(item.bind.not("key"))
								.flex(0, 0)
								.fontSize(12),
							UI.Spacer(),
							UI.Text(item.bind("display"))
								.dim()
								.fontSize(12)
								.style(item.bind("invalid").then({ strikeThrough: true })),
						),
					),
			).outer(
				UI.Column()
					.scroll()
					.flex(0)
					.maxHeight(152)
					.onRendered("HistoryScrollRendered"),
			),
			UI.List(v.bind("properties"), (item) =>
				UI.Column()
					.height(32)
					.padding({ x: 8 })
					.distribute("center")
					.cursor("pointer")
					.background(item.bind("listItem").then(UI.colors.text.alpha(0.05)))
					.onClick("PropertyClick")
					.onMouseEnter("HighlightEnter")
					.onMouseLeave("HighlightLeave")
					.with(
						UI.Row(
							UI.Image(UI.icons.chevronDown)
								.hideWhen(item.bind.not("isList"))
								.size(16)
								.fg(UI.colors.blue.alpha(0.8))
								.position({ gravity: "overlay", top: 2, end: 0 }),
							UI.Image(icons.selectElement)
								.hideWhen(item.bind.not("view"))
								.size(16)
								.fg(UI.colors.blue.alpha(0.8))
								.position({ gravity: "overlay", top: 2, end: 0 }),
							UI.Text(item.bind("key"))
								.hideWhen(item.bind("listItem"))
								.flex(0, 0)
								.width(120)
								.padding({ end: 8 })
								.fontSize(12)
								.dim(item.bind("private"))
								.bold(item.bind("builtin")),
							UI.Text(item.bind("display"))
								.style(item.bind("invalid").then({ strikeThrough: true }))
								.fontSize(12)
								.padding(item.bind("listItem").then({ start: 120 }))
								.dim(item.bind("private")),
						).gap(0),
					),
			)
				.appendSpacer()
				.outer(
					UI.Column()
						.divider()
						.scroll()
						.onRendered("PropertyScrollRendered")
						.hideWhen(v.bind("properties.length").not()),
				),
			UI.Column()
				.hideWhen(v.bind("displayValue").equals(undefined))
				.layout({ clip: true, gravity: "start", distribution: "start" })
				.padding(8)
				.with(
					UI.Text("value").bold().dim().fontSize(12),
					UI.Text(v.bind("displayValue"))
						.fontFamily("monospace")
						.fontSize(12)
						.selectable()
						.wrap("pre-wrap")
						.style({ css: { wordBreak: "break-all" } }),
					UI.IconButton(icons.console)
						.ghost()
						.position("overlay", 4, 4)
						.hideWhen(v.bind.not("setExpr"))
						.onClick("SetExpr"),
				),
			UI.Column()
				.effect("drag-modal", true)
				.flex()
				.hideWhen(
					Binding.any(
						v.bind("displayValue").equals(undefined),
						new Binding("docked"), // from MainOverlayView
					),
				),
		);

export class InspectPanelView extends Widget {
	protected override get body() {
		return BodyView(Binding.from(this)).build();
	}

	object?: unknown = undefined;
	history = new ObservableList<PropertyInfo>();
	properties = new ObservableList<PropertyInfo>();
	setExpr?: { object: any; key: string | number | symbol } = undefined;
	displayValue?: string;

	setObject(object: unknown) {
		this.history.clear();
		this.object = object;
		this.setExpr = undefined;
		this.update(true);
	}

	findHistory(type: { whence: (object: any) => any }) {
		if (!this.history.length) {
			this.history.add(new PropertyInfo().setValue(this.object));
		}
		let object = this.history.first()?.value || this.object;
		while (object) {
			object = type.whence(object);
			if (object) {
				let item = new PropertyInfo().setValue(object);
				this.history.insert(item, this.history.first());
			}
		}
		app.schedule(() => this.fixScroll());
	}

	protected override beforeRender(): void {
		if (!this.history.length && this.object != null) {
			this.history.add(new PropertyInfo().setValue(this.object));
		}
		let h = setInterval(() => {
			if (this.isUnlinked()) clearInterval(h);
			else this.update();
		}, 200);
		this.update();
	}

	protected update(force?: boolean) {
		for (let item of this.history) {
			if (item.value instanceof ObservableObject && item.value.isUnlinked()) {
				item.invalid = true;
			}
		}

		let object = this.object;
		let builtins: PropertyInfo[] = [];
		let items: PropertyInfo[] = [];
		let privItems: PropertyInfo[] = [];
		if (typeof this.object === "object" && this.object !== null) {
			let existing = force
				? new Map<string, PropertyInfo>()
				: new Map(this.properties.map((i) => [i.key, i]));
			let map = PropertyInfo.getPropertyMap(object);
			let keys = [...map.keys()];
			let prev: PropertyInfo | undefined;
			for (let key of keys.slice(0, MAX_ITEMS)) {
				let item = existing.get(key) || new PropertyInfo(key);
				item = map.get(key)!(item);
				if (prev && !prev.listItem && item.listItem) prev.isList = true;
				let list = item.builtin ? builtins : item.private ? privItems : items;
				list.push(item);
				prev = item;
			}
			if (keys.length > MAX_ITEMS) {
				privItems.push(
					new PropertyInfo("..." + (keys.length - MAX_ITEMS) + " more"),
				);
			}
			if (keys.length === 0) {
				privItems.push(new PropertyInfo("<empty>"));
			}
		}
		this.properties.replaceAll([...builtins, ...items, ...privItems]);
		this.displayValue = typeof object !== "object" ? String(object) : undefined;
	}

	protected onPropertyClick(e: UIListViewEvent<PropertyInfo>) {
		let item = e.data.listViewItem;
		if (!item) return;
		if (
			e.data.event instanceof MouseEvent &&
			(e.data.event.ctrlKey || e.data.event.metaKey)
		) {
			this.emit("ShowFloat", { object: item.value });
			return;
		}
		this.history.add(item);
		this.object = item.value;
		this.setExpr = item.set;
		this.update(true);
		app.schedule(() => this.fixScroll());
	}

	protected onHistoryClick(e: UIListViewEvent<PropertyInfo>) {
		let item = e.data.listViewItem;
		if (!item) return;
		let found = false;
		for (let it of this.history) {
			if (found) this.history.remove(it);
			else if (it === item) found = true;
		}
		this.object = item.value;
		this.setExpr = item.set;
		this.update(true);
		app.schedule(() => this.fixScroll());
	}

	protected onSetExpr() {
		this.emit("SetExpr", this.setExpr);
		return true;
	}

	protected onHighlightEnter(e: UIListViewEvent<PropertyInfo>) {
		let item = e.data.listViewItem;
		this.emit("HighlightView", { view: item?.view });
	}

	protected onHighlightLeave() {
		this.emit("HighlightView", { view: undefined });
	}

	protected async fixScroll() {
		await app.queue.waitAsync();
		this._propertyScroll?.scrollToTop();
		this._historyScroll?.scrollToBottom();
	}

	protected onHistoryScrollRendered(e: ViewEvent<UIScrollView>) {
		this._historyScroll = e.source;
	}

	protected onPropertyScrollRendered(e: ViewEvent<UIScrollView>) {
		this._propertyScroll = e.source;
	}

	_historyScroll?: UIScrollView;
	_propertyScroll?: UIScrollView;
}
