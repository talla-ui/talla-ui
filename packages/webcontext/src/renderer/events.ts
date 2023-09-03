import { UIComponent } from "desk-frame";
import { BaseObserver } from "./observers/BaseObserver.js";
import { CLASS_MODAL_SHADER } from "../style/defaults/css.js";

/** @internal Unique ID that's used as a property name for output references on DOM elements */
export const ELT_HND_PROP =
	"Desk__Handler_" +
	((window as any).DOM_UI_RENDER_MODULE_ID =
		((window as any).DOM_UI_RENDER_MODULE_ID || 1000) + 1) +
	Math.floor(Math.random() * 1e6);

/** UI component event names that are used for DOM events */
const _eventNames: { [domEventName: string]: string } = {
	click: "Click",
	dblclick: "DoubleClick",
	contextmenu: "ContextMenu",
	mouseup: "MouseUp",
	mousedown: "MouseDown",
	touchstart: "TouchStart",
	touchend: "TouchEnd",
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
	ArrowLeft: true,
	ArrowRight: true,
	ArrowUp: true,
	ArrowDown: true,
};

/** Last time a touch event was handled, used for blocking clicks after touches */
let _lastTouchT = 0;

/** Last renderer where a touchstart occurred */
let _lastTouchObserver: any;

/** Current touch-move handler on the window, if any */
let _touchMoveHandler: any;

/** @internal Helper function that adds event handlers for all used DOM events */
export function registerHandlers(elt: HTMLElement) {
	elt.removeEventListener("focusin", detractFocus, true);
	elt.addEventListener("focusin", detractFocus, true);

	for (let name of Object.keys(_eventNames)) {
		elt.removeEventListener(name, eventHandler);
		elt.addEventListener(name, eventHandler);
	}
}

/** Helper function that handles DOM events on all UI components, max 2 levels up from target element */
function eventHandler(this: HTMLElement, e: Event) {
	let target = e.target as Node | null;
	let observer: BaseObserver<any> | undefined;
	while (target && !(target instanceof HTMLElement))
		target = target.parentElement;
	if (target) {
		observer = (target as any)[ELT_HND_PROP];
		if (observer) return handleObserverEvent(observer, e);
		target = target.parentElement;
		if (target) {
			observer = (target as any)[ELT_HND_PROP];
			if (observer) return handleObserverEvent(observer, e);
			target = target.parentElement;
			if (target) {
				observer = (target as any)[ELT_HND_PROP];
				if (observer) return handleObserverEvent(observer, e);
			}
		}
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

/** Helper function that works as an event handler to stop input focus outside the last modal element, if any */
function detractFocus(this: HTMLElement, e: Event) {
	let modals = document.querySelectorAll("." + CLASS_MODAL_SHADER);
	if (!modals.length) return;
	let lastModal = modals.item(modals.length - 1) as HTMLElement;
	if (lastModal && e.target && e.target !== lastModal) {
		let pos = lastModal.compareDocumentPosition(e.target as any);
		if (!(pos & Node.DOCUMENT_POSITION_CONTAINED_BY)) {
			e.preventDefault();
			setTimeout(() => {
				let detractor = document.createElement("div");
				detractor.tabIndex = -1;
				lastModal.insertBefore(detractor, lastModal.firstChild);
				detractor.focus();
				lastModal.removeChild(detractor);
			}, 0);
		}
	}
}

/** Helper function that emits one or more events on a UI component */
function handleObserverEvent(observer: BaseObserver<UIComponent>, e: Event) {
	if (e.type === "click" || e.type === "mousedown" || e.type === "mouseup") {
		if (_lastTouchT > Date.now() - 1000) return;
	}

	// find event name and propagate event to component itself
	let uiEventName = _eventNames[e.type];
	let component = observer.observed;
	if (!uiEventName || !component) return;
	observer.onDOMEvent(e);
	component.emit(uiEventName, { event: e });

	// set time of last touch event, and watch for moves
	if (uiEventName === "TouchStart") {
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
		component.emit("MouseDown", { event: e });
	}

	// simulate mouse up and click on touch (if not moved)
	if (uiEventName === "TouchEnd") {
		_lastTouchT = Date.now();
		if (_lastTouchObserver === observer) {
			component.emit("MouseUp", { event: e });
			component.emit("Click", { event: e });
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
			let role =
				target &&
				(target.getAttribute("role") ||
					(target.parentElement && target.parentElement.getAttribute("role")));
			if (role === "list" || role === "listitem") {
				e.preventDefault();
			}
		}
		if (!ignore && keyName) {
			setTimeout(() => {
				component!.emit(keyName + "Press", { event: e });
			}, 0);
		}
	}
	e.stopPropagation();
}
