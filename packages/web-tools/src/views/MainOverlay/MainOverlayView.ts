import {
	Activity,
	app,
	Binding,
	ModalMenuOptions,
	ObservableEvent,
	ObservableList,
	UIButton,
	UIElement,
	View,
	ViewEvent,
	Widget,
} from "@talla-ui/core";
import { LogModel } from "../../LogModel";
import { bringToForeground, insertAndKeepScroll } from "../ClickForeground";
import { ConsoleOverlayView } from "../ConsoleOverlay/ConsoleOverlayView";
import { FloatOverlayView } from "../FloatOverlay/FloatOverlayView";
import { IndexPanelView } from "../IndexPanel/IndexPanelView";
import { InspectPanelView } from "../InspectPanel/InspectPanelView";
import { ViewPickerPanelView } from "../ViewPickerPanel/ViewPickerPanelView";
import { DOMHighlight } from "./DOMHighlight";
import { MainOverlayViewBody } from "./view";

export type OverlayViewMode = "index" | "inspect" | "picker" | "minimized";

const LOCAL_STORAGE_KEY = "webToolsOverlay";

export class MainOverlayView extends Widget {
	constructor(logModel: LogModel, defaultMinimized?: boolean) {
		super();
		this.log = logModel;
		app.schedule(async () => {
			this.restoreState(defaultMinimized);
			app.schedule(() => this._fixElementOrder, 0);
		});
	}

	protected override get body() {
		return MainOverlayViewBody(Binding.from(this)).build();
	}

	mode?: OverlayViewMode = "index";
	docked = false;
	overlayPosition: UIElement.Position = {
		bottom: 16,
		left: 16,
		gravity: "overlay",
	};

	indexView = this.attach(new IndexPanelView(), { delegate: this });
	inspectView = this.attach(new InspectPanelView(), { delegate: this });
	pickerView?: Widget;
	consoleView?: ConsoleOverlayView;
	log: LogModel;

	saveState() {
		try {
			localStorage.setItem(
				LOCAL_STORAGE_KEY,
				JSON.stringify({
					mode: this.mode,
					dock: this._wasDocked,
					console: this.consoleView?.evalHistory.slice(-100),
				}),
			);
		} catch (e) {
			app.log.error("Web tools: failed to save state", e);
		}
	}

	restoreState(defaultMinimized?: boolean) {
		try {
			const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
			if (!stored) {
				if (defaultMinimized) this.minimize();
				return;
			}
			const data = JSON.parse(stored);
			if (data.mode === "minimized") {
				this.minimize();
				this._wasDocked = data.dock as any;
				return;
			}
			if (data.dock === "left") this.dockLeftSide();
			else if (data.dock === "right") this.dockRightSide();
			else if (data.dock === "mobile") this.emulateMobile();
			else this.showIndex();
		} catch {
			if (defaultMinimized) this.minimize();
		}
	}

	minimize() {
		if (this.docked) this.undock();
		this.mode = "minimized";
		this.clearPicker();
		this.saveState();
	}

	emulateMobile(size: "small" | "normal" = "normal") {
		this._mobileBgBox = this._mobileBgBox || document.createElement("div");
		this._mobileBgBox.style.position = "fixed";
		this._mobileBgBox.style.left = "0";
		this._mobileBgBox.style.right = "0";
		this._mobileBgBox.style.top = "0";
		this._mobileBgBox.style.bottom = "0";
		this._mobileBgBox.style.background = "rgba(0,0,0,0.5)";
		document.body.insertBefore(this._mobileBgBox, document.body.firstChild);
		(app.renderer as any).setViewportLocation({
			left: Math.max(328, window.innerWidth / 2.5),
			top: window.innerHeight > 720 ? 32 : 4,
			width: size === "small" ? 320 : 375,
			height: size === "small" ? 560 : 667,
		});
		this.setPosition({ top: 0, left: 0, bottom: 0 });
		this.docked = true;
		this._fixElementOrder();
		this._wasDocked = "mobile";
		this._mobileSize = size;
		this.saveState();
	}

	dockLeftSide() {
		(app.renderer as any).setViewportLocation({ left: 320 });
		this.setPosition({ top: 0, left: 0, bottom: 0 });
		this.docked = true;
		this._fixElementOrder();
		this._wasDocked = "left";
		this.saveState();
	}

	dockRightSide() {
		(app.renderer as any).setViewportLocation({ right: 320 });
		this.setPosition({ top: 0, right: 0, bottom: 0 });
		this.docked = true;
		this._fixElementOrder();
		this._wasDocked = "right";
		this.saveState();
	}

	undock() {
		if (this._mobileBgBox) {
			this._mobileBgBox.remove();
		}
		(app.renderer as any).setViewportLocation();
		this.docked = false;
		this._fixElementOrder();
		this.setPosition({ bottom: 16, left: 16 });
		this.saveState();
	}

	setPosition(position: UIElement.Position) {
		if (this.docked) return;
		this.overlayPosition = { ...position, gravity: "overlay" };
	}

	showIndex() {
		this.mode = "index";
		this.saveState();
	}

	showInspect(object?: any) {
		this.mode = "inspect";
		if (object) {
			this.inspectView.setObject(object);
			if (object instanceof View) {
				this.inspectView.findHistory(View);
			}
			this.inspectView.findHistory(Activity);
			this.inspectView.findHistory(ObservableList);
		} else if (this.inspectView.object === undefined) {
			this.inspectView.setObject(
				app.activities.toArray().find((a) => a.isActive()),
			);
			this.inspectView.findHistory(Activity);
			this.inspectView.findHistory(ObservableList);
		}
	}

	showPicker() {
		this.mode = "picker";
		if (!this.pickerView) {
			this.pickerView = this.attach(new ViewPickerPanelView(), {
				delegate: this,
			});
		}
	}

	showConsole(errors?: boolean) {
		if (!this.consoleView || this.consoleView.isUnlinked()) {
			let view = this.attach(new ConsoleOverlayView(this.log), {
				delegate: this,
			});
			this.consoleView = view;
			app.render(view, { mode: "overlay" });
		} else {
			bringToForeground(this.consoleView);
		}
		if (errors) this.consoleView.filterErrorsOnly();
		else this.consoleView.clearFilter();
	}

	showFloat(value: unknown, title?: string) {
		if (value == null) return;
		let window = this.attach(new FloatOverlayView(value, title), {
			delegate: this,
		});
		app.render(window, { mode: "overlay" });
	}

	clearPicker() {
		this.pickerView?.unlink();
		this.pickerView = undefined;
		this._domHighlight.clear();
	}

	protected override beforeRender() {
		let interval = setInterval(() => {
			if (this.isUnlinked()) {
				clearInterval(interval);
				return;
			}
			this._fixElementOrder();
		}, 100);
	}

	protected override beforeUnlink() {
		this._domHighlight.clear();
	}

	protected onClose() {
		this.unlink();
	}

	protected onToggleMinimized() {
		if (this.mode === "minimized") this.mode = "index";
		else this.minimize();
	}

	protected async onMoreMenu(e: ViewEvent<UIButton>) {
		let hasObject = !!this.inspectView.object;
		setTimeout(() => this._fixElementOrder(), 10);
		setTimeout(() => this._fixElementOrder(), 30);
		let option = await app.showModalMenuAsync(
			new ModalMenuOptions([
				{ text: "Show log", value: "showLog" },
				{ text: "Log object", value: "logObject", disabled: !hasObject },
				{ text: "Pin new window", value: "showFloat", disabled: !hasObject },
				{ divider: true },
				{ text: "Remount", value: "remount" },
				{ divider: true },
				...(this.docked && this._wasDocked === "mobile"
					? [{ text: "Undock", value: "undock" }]
					: []),
				...(this.docked && this._wasDocked !== "mobile"
					? this._wasDocked === "left"
						? [
								{ text: "Undock", value: "undock" },
								{ text: "Dock right side", value: "dockRight" },
							]
						: [
								{ text: "Undock", value: "undock" },
								{ text: "Dock left side", value: "dockLeft" },
							]
					: [
							{ text: "Dock left side", value: "dockLeft" },
							{ text: "Dock right side", value: "dockRight" },
						]),
				{ divider: true },
				...(!this.docked || this._wasDocked !== "mobile"
					? [
							{ text: "Emulate mobile", value: "emulate" },
							{ text: "Emulate mobile (small)", value: "emulate-s" },
						]
					: []),
				...(this.docked && this._wasDocked === "mobile"
					? this._mobileSize === "small"
						? [{ text: "Normal size", value: "emulate" }]
						: [{ text: "Small size", value: "emulate-s" }]
					: []),
			]),
			e.source,
		);
		switch (option) {
			case "showLog":
				this.showConsole();
				break;
			case "logObject":
				this.showConsole();
				await new Promise((resolve) => setTimeout(resolve, 100));
				this.consoleView?.goEval("$_ // Inspector object");
				break;
			case "remount":
				app.remount();
				break;
			case "showFloat":
				this.showFloat(this.inspectView.object);
				break;
			case "dockLeft":
				if (this.docked) this.undock();
				this.dockLeftSide();
				break;
			case "dockRight":
				if (this.docked) this.undock();
				this.dockRightSide();
				break;
			case "emulate":
			case "emulate-s":
				if (this.docked) this.undock();
				this.emulateMobile(option === "emulate-s" ? "small" : "normal");
				break;
			case "undock":
				this._wasDocked = undefined;
				this.undock();
				break;
		}
	}

	protected onUnminimize() {
		if (this._wasDocked === "left") this.dockLeftSide();
		else if (this._wasDocked === "right") this.dockRightSide();
		else if (this._wasDocked === "mobile") this.emulateMobile();
		else this.showIndex();
	}

	protected onShowConsole() {
		this.showConsole();
	}

	protected onShowErrors() {
		this.showConsole(true);
	}

	protected onShowIndex() {
		this.clearPicker();
		this.showIndex();
	}

	protected onShowInspector() {
		this.clearPicker();
		this.showInspect();
	}

	protected onShowPicker() {
		this.showPicker();
	}

	protected onClearPicker() {
		this.clearPicker();
	}

	protected onShowFloat(e: ObservableEvent) {
		this.showFloat(e.data.object, String(e.data.title || "") || undefined);
	}

	protected onInspectObject(e: ObservableEvent) {
		this.showInspect(e.data.object);
	}

	protected onSetExpr(e: ObservableEvent) {
		this.showConsole();
		this.consoleView?.setPropertyExpr(e.data.object, e.data.key as any);
	}

	protected onHighlightView(e: ObservableEvent) {
		this._domHighlight.highlight(e.data.view, {
			left: this.docked && this._wasDocked === "left" ? "320px" : undefined,
			right: this.docked && this._wasDocked === "right" ? "320px" : undefined,
		});
	}

	private _fixElementOrder() {
		// find all web tools overlays, AND dropdown menus
		const webToolsElements: HTMLElement[] = Array.from(
			document.querySelectorAll(
				'[data-name^="WebTools"],web-handler-overlay-wrapper>container>[role=menu]',
			),
		);
		if (!webToolsElements.length) return;

		// find associated body elements
		const overlays = webToolsElements.map((elt) => {
			while (elt) {
				if (elt.parentElement === document.body) break;
				elt = elt.parentElement!;
			}
			if (this.docked && !elt.dataset.docked) {
				elt.dataset.docked = "true";
				elt.style.inset = "0";
				elt.style.width = "";
				elt.style.height = "";
			}
			if (!this.docked) {
				elt.removeAttribute("data-docked");
			}
			return elt;
		});

		// move all overlays to the back if needed
		let cur: Element = overlays[0]!;
		let hasOther = false;
		while (cur) {
			let nextElt = cur.nextElementSibling;
			if (!nextElt) break;
			cur = nextElt;
			if (!overlays.includes(cur as any)) {
				hasOther = true;
				break;
			}
		}
		if (!hasOther) return;
		for (let elt of overlays) {
			insertAndKeepScroll(elt, null);
		}
	}

	_domHighlight = new DOMHighlight();
	_mobileBgBox?: HTMLElement;
	_wasDocked?: "left" | "right" | "mobile";
	_mobileSize?: "small" | "normal";
}
