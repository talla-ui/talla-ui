import * as talla_ui from "@talla-ui/core";
import {
	app,
	Binding,
	ObservableEvent,
	ObservableList,
	UI,
	UIColumn,
	UIListViewEvent,
	UIScrollView,
	UITextField,
	ViewEvent,
	Widget,
} from "@talla-ui/core";
import { LogMessage, LogModel } from "../../LogModel";
import { PropertyInfo } from "../../PropertyInfo";
import { MainOverlayView } from "../MainOverlay/MainOverlayView";

const LOCAL_STORAGE_KEY = "webToolsConsole";

const BodyView = (v: Binding<ConsoleOverlayView>) =>
	UI.Column()
		.name("WebToolsConsole")
		.onKey("Escape", "Close")
		.background(UI.colors.background.alpha(0.8))
		.effect("click-foreground")
		.position({ gravity: "overlay", bottom: 16, right: 16 })
		.width(620)
		.maxWidth("90vw")
		.height(300)
		.border(2, UI.colors.background.brighten(0.5), "solid", 8)
		.style({
			css: {
				backdropFilter: "blur(15px)",
				boxShadow: "0 0 0 4px rgba(0,0,0,0.4)",
			},
		})
		.with(
			UI.Row()
				.background("background")
				.effect("drag-modal", true)
				.height(40)
				.padding({ start: 8, end: 4 })
				.with(
					UI.Text("Console").bold().shrink(0),
					UI.Spacer(8),
					UI.Row(
						UI.Button("all")
							.style("small")
							.background("transparent")
							.minWidth(0)
							.borderRadius(4)
							.pressed(v.bind.not("errorFilter"))
							.onClick("FilterAll"),
						UI.Button("errors")
							.style("small")
							.background("transparent")
							.minWidth(0)
							.borderRadius(4)
							.pressed(v.bind("errorFilter"))
							.onClick("FilterError"),
					).gap(4),
					UI.Spacer(),
					UI.Row(
						UI.Image(UI.icons.search)
							.margin(8)
							.size(16)
							.dim()
							.onClick("RequestFocusNext"),
						UI.Spacer(),
						UI.TextField("Search")
							.type("search")
							.style("ghost")
							.fontSize(12)
							.height(32)
							.padding({ start: 32, end: 4, y: 4 })
							.position("cover")
							.onKey("Escape", "Ignore")
							.onInput("FilterSearch"),
					)
						.style({ width: 80, css: { transition: "width 0.3s ease-in-out" } })
						.onFocusIn((_, row) => {
							row.setStyle({ width: 240 });
						})
						.onFocusOut((e, row) => {
							let tf = e.source;
							if ("value" in tf && tf.value) return;
							row.setStyle({ width: 80 });
						})
						.shrink(),
					UI.Button().icon(UI.icons.close, 16).style("icon").onClick("Close"),
				),
			UI.Divider().margin(0),
			UI.List(v.bind("list"), (item) =>
				UI.Column()
					.grow(false)
					.padding({ x: 8, top: 16, bottom: 2 })
					.border({ top: 1 }, "divider")
					.cursor("pointer")
					.style({ css: { outlineOffset: "-2px" } })
					.onRendered("ItemRendered")
					.onClick("ShowItem")
					.onKey("Enter", "ShowItem")
					.onKey("ArrowDown", "FocusNext")
					.onKey("ArrowUp", "FocusPrevious")
					.allowFocus()
					.stretch()
					.center()
					.with(
						UI.Text()
							.fmt("{} {1:?/= {1}}", item.bind("time"), item.bind("var"))
							.fontSize(10)
							.dim()
							.position({ gravity: "overlay", top: 2, start: 8 }),
						UI.Text(item.bind("loc"))
							.grow()
							.fontSize(10)
							.dim()
							.textAlign("end")
							.position({ gravity: "overlay", top: 2, end: 4 }),
						UI.Text(item.bind("expr"))
							.hideWhen(item.bind.not("expr"))
							.width("100%")
							.fontSize(12)
							.fontFamily("monospace"),
						UI.Text(item.bind("text"))
							.hideWhen(item.bind.not("text"))
							.width("100%")
							.style(
								item
									.bind("level")
									.map((level) => level === 4 || level === 5)
									.then(
										{
											fontSize: 12,
											fontFamily: "monospace",
											lineBreakMode: "pre-wrap",
											textColor: UI.colors.red,
										},
										{
											fontSize: 12,
											fontFamily: "monospace",
											lineBreakMode: "pre-wrap",
										},
									),
							),
						UI.Text(item.bind("dataDisplay"))
							.hideWhen(item.bind.not("dataDisplay"))
							.width("100%")
							.padding({ start: 16 })
							.fontFamily("monospace")
							.fontSize(12),
					),
			).outer(
				UI.Column()
					.layout({ distribution: "end" })
					.name("WebToolsConsoleList")
					.accessibleRole("list")
					.allowKeyboardFocus()
					.onFocusIn("SetListFocus")
					.scroll()
					.stretch(),
			),
			UI.Divider().margin(0),
			UI.Row()
				.margin({ x: 2 })
				.padding(2)
				.height(36)
				.with(
					UI.Image(UI.icons.chevronNext).opacity(
						v.bind("errorFilter").then(0.5, 1),
					),
					UI.TextField()
						.position("cover")
						.hideWhen(v.bind("errorFilter"))
						.style("ghost")
						.size("100%", 28)
						.padding({ start: 22, y: 4 })
						.fontFamily("monospace")
						.fontSize(12)
						.requestFocus()
						.onInput("EvalInput")
						.onKeyDown("EvalKeyDown")
						.onKey("Enter", "Eval")
						.onKey("ArrowUp", "HistoryBack")
						.onKey("ArrowDown", "HistoryForward"),
				),
		);

export class ConsoleOverlayView extends Widget {
	constructor(logModel: LogModel) {
		super();
		this.log = logModel;
		this.list = logModel.list;
		app.schedule(() => {
			this.restoreState();
		});
	}

	protected override get body() {
		return BodyView(Binding.from(this)).build();
	}

	log: LogModel;
	list: ObservableList<LogMessage>;
	errorFilter = false;
	evalHistory: string[] = [];
	historyPos?: number;

	saveState() {
		try {
			localStorage.setItem(
				LOCAL_STORAGE_KEY,
				JSON.stringify({
					history: this.evalHistory,
				}),
			);
		} catch (err) {
			app.log.error("Failed to save console state", { error: err });
		}
	}

	restoreState() {
		try {
			const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
			if (stored) {
				const data = JSON.parse(stored);
				if (data.history && Array.isArray(data.history)) {
					this.evalHistory = data.history;
				}
			}
		} catch {
			// ignore errors
		}
	}

	clearFilter() {
		this.errorFilter = false;
		this.list = this.log?.list;
	}

	filterErrorsOnly() {
		this.errorFilter = true;
		this.list = this.log?.errorList;
	}

	filterSearch(search?: string) {
		let list = this.errorFilter ? this.log?.errorList : this.log?.list;
		if (!search || !list) {
			this.list = list;
			return;
		}
		search = search.toLowerCase();
		this.list = new ObservableList(
			...list.filter((item) =>
				[item.text, item.expr, item.dataDisplay].some((text) =>
					text?.toLowerCase().includes(search),
				),
			),
		);
	}

	setPropertyExpr(object: any, key: string | number | symbol) {
		(window as any).$0 = object;
		let access = "";
		if (typeof key === "symbol") {
			(window as any)["$expr_symbol"] = key;
			access = "[$expr_symbol]";
		} else if (typeof key === "string" && /^[a-zA-Z_]\w*$/.test(key)) {
			access = "." + key;
		} else {
			access = "[" + JSON.stringify(key) + "]";
		}
		let tf = this.findViewContent(UITextField).pop()!;
		tf.value = "$0" + access + " = ";
		tf.requestFocus();
	}

	goEval(expr: string) {
		if (!expr) return;
		let varIdx = (window as any)._WebToolsEvalVar || 1;
		try {
			let result = this._runEval(expr);
			let varName = "$" + varIdx;
			(window as any)[varName] = result;
			app.log.debug("Eval result", { result, _eval: expr, _var: varName });
			(window as any)._WebToolsEvalVar = varIdx + 1;
			return true;
		} catch (err) {
			app.log.error("Eval error", {
				message: String(err),
				error: err,
				_eval: expr,
			});
		}
	}

	protected onClose() {
		this.unlink();
	}

	protected onFilterAll() {
		this.clearFilter();
	}

	protected onFilterError() {
		this.filterErrorsOnly();
	}

	protected onFilterSearch(e: ViewEvent<UITextField>) {
		this.filterSearch(e.source.value);
	}

	protected onItemRendered() {
		this._scheduleScroll();
	}

	protected onSetListFocus(e: ObservableEvent) {
		while (e.inner) e = e.inner;
		if (e.source instanceof UIColumn && e.source.accessibleRole === "list") {
			e.source.content.last()?.requestFocus();
		}
	}

	protected onShowItem(e: UIListViewEvent<LogMessage>) {
		let item = e.data.listViewItem;
		let value = !item.data.length
			? item.text
			: item.data.length === 1
				? item.data[0]
				: item.data;
		this.emit("ShowFloat", { object: value, title: item.var });
	}

	protected onEval(e: ViewEvent<UITextField>) {
		let tf = e.source;
		let expr = tf.value || "";
		tf.value = "";
		if (this.evalHistory[this.evalHistory.length - 1] !== expr) {
			this.evalHistory.push(expr);
		}
		if (this.goEval(expr)) {
			this.saveState();
		}
		tf.requestFocus();
	}

	protected onEvalKeyDown(e: ViewEvent<UITextField>) {
		let tf = e.source;
		let expr = tf.value || "";
		let event = e.data.event as KeyboardEvent;

		// only care about tab key presses with simple variable/property
		if (!expr || event.key !== "Tab" || event.shiftKey) return;
		event.preventDefault();
		if (!/^[ \w\$\.\[\]]+$/.test(expr)) return;

		// match last part (ID) and trim it off, along with last dot
		let partialWord = expr.match(/[\w\$]+$/)?.[0] || "";
		if (partialWord) expr = expr.slice(0, -partialWord.length);
		if (expr.endsWith(".")) expr = expr.slice(0, -1);
		if (!expr) expr = "_";

		// get all properties of the expression result
		try {
			let result = this._runEval(expr);
			let keys = PropertyInfo.getPropertyMap(result, true).keys();
			for (let key of keys) {
				if (!partialWord && key.startsWith("_")) continue;
				if (key.startsWith(partialWord)) {
					let prefix = partialWord
						? tf.value.slice(0, -partialWord.length)
						: tf.value;
					if (/^\d|[^\w\$]/.test(key)) {
						key = "[" + JSON.stringify(key) + "]";
						if (prefix.endsWith(".")) prefix = prefix.slice(0, -1);
					}
					tf.value = prefix + key;
					break;
				}
			}
		} catch {}
	}

	protected onEvalInput() {
		this.historyPos = undefined;
	}

	protected onHistoryBack() {
		if (this.historyPos == null) this.historyPos = this.evalHistory.length;
		this.historyPos--;
		if (this.historyPos < 0) this.historyPos = 0;
		let tf = this.findViewContent(UITextField).pop()!;
		tf.value = this.evalHistory[this.historyPos] || "";
	}

	protected onHistoryForward() {
		if (this.historyPos == null) return;
		this.historyPos++;
		if (this.historyPos > this.evalHistory.length - 1) this.historyPos--;
		let tf = this.findViewContent(UITextField).pop()!;
		tf.value = this.evalHistory[this.historyPos] || "";
	}

	private _runEval(expr: string): unknown {
		let mainOverlay = MainOverlayView.whence(this)!;
		let context = {
			...talla_ui,
			$_: mainOverlay.inspectView.object,
		};
		let f = new Function("_", "with (_) return (\n" + expr + "\n)");
		return f(context);
	}

	private _scheduleScroll() {
		app.schedule(async () => {
			await app.queue.waitAsync();
			app.schedule(async () => {
				await app.queue.waitAsync();
				if (this.isUnlinked()) return;
				this.findViewContent(UIScrollView)[0]?.scrollToBottom();
			}, 100);
		});
	}
}
