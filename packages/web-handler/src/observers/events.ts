import { UIElement } from "@talla-ui/core";
import type { BaseObserver } from "./BaseObserver.js";

/** @internal Unique ID that's used as a property name for output references on DOM elements */
export const ELT_HND_PROP =
	"Web__Handler_" +
	((window as any).DOM_UI_RENDER_MODULE_ID =
		((window as any).DOM_UI_RENDER_MODULE_ID || 1000) + 1) +
	Math.floor(Math.random() * 1e6);

/** @internal Dataset property name for boolean on page and modal mount elements */
const DATA_MOUNT_PROP = "webhandler__focusmount";

/** UI element event names that are used for DOM events */
const _eventNames: { [domEventName: string]: string } = {
	click: "Click",
	dblclick: "DoubleClick",
	contextmenu: "ContextMenu",
	mousedown: "Press",
	mouseup: "Release",
	keydown: "KeyDown",
	keyup: "KeyUp",
	keypress: "KeyPress",
	focusin: "FocusIn",
	focusout: "FocusOut",
	change: "Change",
	input: "Input",
	copy: "Copy",
	cut: "Cut",
	paste: "Paste",
};

/** Key names for `keydown` events */
const _keyNames: { [keyName: string]: string } = {
	Enter: "EnterKey",
	Spacebar: "Spacebar",
	" ": "Spacebar",
	Backspace: "BackspaceKey",
	Delete: "DeleteKey",
	Del: "DeleteKey",
	Escape: "EscapeKey",
	Esc: "EscapeKey",
	Tab: "TabKey",
	ArrowLeft: "ArrowLeftKey",
	Left: "ArrowLeftKey",
	ArrowUp: "ArrowUpKey",
	Up: "ArrowUpKey",
	ArrowRight: "ArrowRightKey",
	Right: "ArrowRightKey",
	ArrowDown: "ArrowDownKey",
	Down: "ArrowDownKey",
};

/** Keys for which OS actions should be prevented if used on lists and list items */
const _listKeysPreventDefault: { [keyName: string]: boolean } = {
	Spacebar: true,
	" ": true,
	ArrowLeft: true,
	ArrowRight: true,
	ArrowUp: true,
	ArrowDown: true,
};

/** Roles for which keyboard default actions should be prevented */
const _listRolesPreventKeys: { [roleName: string]: boolean } = {
	list: true,
	listitem: true,
	table: true,
	cell: true,
	option: true,
};

/** Last time a touch event was handled, used for blocking clicks after touches */
let _lastTouchT = 0;

/** Last renderer where a touchstart occurred */
let _lastTouchObserver: any;

/** Current touch-move handler on the window, if any */
let _touchMoveHandler: any;

/** @internal Helper function that adds event handlers for all used DOM events */
export function registerHandlers(elt: HTMLElement, isFullMount?: boolean) {
	elt.removeEventListener("focusin", detractFocus, true);
	elt.addEventListener("focusin", detractFocus, true);
	for (let name of Object.keys(_eventNames)) {
		elt.removeEventListener(name, eventHandler);
		elt.addEventListener(name, eventHandler);
	}
	if (isFullMount) elt.dataset[DATA_MOUNT_PROP] = "1";
}

/** Helper function that handles DOM events on all UI elements, max 2 levels up from target element */
function eventHandler(this: HTMLElement, e: Event) {
	let target = e.target as Node | null;
	if (!target) return;

	// don't handle any events if before (last) page/modal mount
	// (these may happen with e.g. screen readers)
	let mountElts = document.querySelectorAll("[data-" + DATA_MOUNT_PROP + "]");
	let lastPage = mountElts.item(mountElts.length - 1);
	let pagePos = lastPage?.compareDocumentPosition(target);
	if (pagePos & Node.DOCUMENT_POSITION_PRECEDING) return;

	// handle events on target element using observer
	let observer: BaseObserver<any> | undefined;
	if (!(target instanceof HTMLElement)) target = target.parentElement;
	while (target && target !== this) {
		observer = (target as any)[ELT_HND_PROP];
		if (observer) return handleObserverEvent(observer, e);
		target = target.parentElement;
	}

	// handle key events on first observer within, e.g. main modal/page content
	if (e.type === "keydown" || e.type === "keypress") {
		let inner = this.firstChild;
		if (inner) {
			let key = (e as KeyboardEvent).key;
			if (_listKeysPreventDefault[key]) {
				e.preventDefault();
			}
			observer = (inner as any)[ELT_HND_PROP];
			if (observer) return handleObserverEvent(observer, e);
			inner = inner.firstChild;
			if (inner) {
				observer = (inner as any)[ELT_HND_PROP];
				if (observer) return handleObserverEvent(observer, e);
			}
		}
	}
}

/** Helper function that works as an event handler to stop input focus outside the last page/modal element, if any */
function detractFocus(this: HTMLElement, e: Event) {
	let mountElts = document.querySelectorAll("[data-" + DATA_MOUNT_PROP + "]");
	if (!mountElts.length) return;
	let lastFullElt = mountElts.item(mountElts.length - 1) as HTMLElement;
	if (lastFullElt && e.target && e.target !== lastFullElt) {
		let pos = lastFullElt.compareDocumentPosition(e.target as any);
		if (
			!(pos & Node.DOCUMENT_POSITION_CONTAINED_BY) &&
			!(pos & Node.DOCUMENT_POSITION_FOLLOWING)
		) {
			e.preventDefault();
			setTimeout(() => {
				let detractor = document.createElement("div");
				detractor.tabIndex = -1;
				lastFullElt.insertBefore(detractor, lastFullElt.firstChild);
				detractor.focus();
				lastFullElt.removeChild(detractor);
			}, 0);
		}
	}
}

/** Helper function that emits one or more events on a UI element */
function handleObserverEvent(observer: BaseObserver<UIElement>, e: Event) {
	if (e.type === "click" || e.type === "mousedown" || e.type === "mouseup") {
		if (_lastTouchT > Date.now() - 1000) return;
	}

	// find event name and propagate event to view itself
	let uiEventName = _eventNames[e.type];
	let view = observer.observed;
	if (!uiEventName || !view) return;
	let data = { event: e };
	if (observer.onDOMEvent(e, data) === false) return;
	view.emit(uiEventName, data);

	// set time of last touch event, and watch for moves
	if (e.type === "touchstart") {
		_lastTouchT = Date.now();
		_lastTouchObserver = observer;
		if (!_touchMoveHandler) {
			window.addEventListener(
				"touchmove",
				(_touchMoveHandler = () => {
					window.removeEventListener("touchmove", _touchMoveHandler);
					_touchMoveHandler = undefined;
					_lastTouchObserver = undefined;
				}),
			);
		}
		view.emit("Press", { event: e });
	}

	// simulate mouse up and click on touch (if not moved)
	if (e.type === "touchend") {
		_lastTouchT = Date.now();
		if (_lastTouchObserver === observer) {
			view.emit("Release", { event: e });
			view.emit("Click", { event: e });
		}
	}

	// handle various key press aliases
	if (uiEventName === "KeyDown") {
		let key = (e as KeyboardEvent).key;
		let keyName = key ? _keyNames[key] : "";
		let ignore = false;
		let target: HTMLElement = e.target as any;
		if (keyName === "EnterKey") {
			let nodeName = target && String(target.nodeName).toLowerCase();
			ignore = nodeName === "button" || nodeName === "textarea";
		}
		if (_listKeysPreventDefault[key]) {
			let role = target && target.getAttribute("role");
			if (!role) {
				let parentElt = target.parentElement;
				role = parentElt && parentElt.getAttribute("role");
			}
			if (role && _listRolesPreventKeys[role]) {
				e.preventDefault();
			}
		}
		if (!ignore && keyName) {
			setTimeout(() => {
				view!.emit(keyName + "Press", { event: e });
			}, 0);
		}
	}
	e.stopPropagation();
}
