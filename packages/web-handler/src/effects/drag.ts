import { app, RenderEffect } from "@talla-ui/core";
import { CLASS_OVERLAY_WRAPPER } from "../defaults/css.js";

// Debounce drag start by keeping track of the last start time
let _dragStart = 0;

// Start dragging only after the cursor has moved a bit
const DRAG_START_PX = 6;

// WeakMaps for double-apply prevention
const appliedDragModal = new WeakSet<HTMLElement>();
const appliedDragRelative = new WeakSet<HTMLElement>();

// Keep track of drag positions per modal element
const _draggedElements = new WeakMap<HTMLElement, { x: number; y: number }>();

/**
 * Drag modal effect - allows dragging of the containing modal element.
 * - Only uses onRendered to add mouse/touch event listeners.
 * - Finds the modal wrapper element and applies CSS transforms on drag.
 */
const dragModalEffect: RenderEffect<HTMLElement> = {
	onRendered(view, output) {
		let element = output.element;
		if (!element || appliedDragModal.has(element)) return;
		appliedDragModal.add(element);

		// store the drag target element (modal), discovered lazily on mouse down
		let dragElt: HTMLElement | undefined;
		function findDragTarget(): HTMLElement | undefined {
			// find modal wrapper by walking up
			let modalWrapper = element.parentElement;
			while (modalWrapper && modalWrapper.className !== CLASS_OVERLAY_WRAPPER) {
				modalWrapper = modalWrapper.parentElement;
			}

			// then, the modal content element is the first child, if any
			return modalWrapper?.firstElementChild as HTMLElement;
		}

		function handlePress(domEvent: MouseEvent | TouchEvent) {
			if (_dragStart > Date.now() - 40 || (domEvent as MouseEvent).button)
				return;
			dragElt ||= findDragTarget();
			if (!dragElt) return;

			let startX =
				((domEvent as TouchEvent).touches &&
					(domEvent as TouchEvent).touches[0]!.clientX) ||
				(domEvent as MouseEvent).clientX;
			let startY =
				((domEvent as TouchEvent).touches &&
					(domEvent as TouchEvent).touches[0]!.clientY) ||
				(domEvent as MouseEvent).clientY;
			if (startX === undefined || startY === undefined) return;

			let initial = _draggedElements.get(dragElt) || { x: 0, y: 0 };
			let dragged = { ...initial };

			_dragStart = Date.now();
			let moved = false;

			function removeAllListeners() {
				window.removeEventListener("touchmove", moveHandler, true);
				window.removeEventListener("mousemove", moveHandler, true);
				window.removeEventListener("touchend", upHandler, true);
				window.removeEventListener("mouseup", upHandler, true);
				window.removeEventListener("click", upHandler, true);
			}

			function moveHandler(e: MouseEvent | TouchEvent) {
				let x =
					((e as TouchEvent).touches &&
						(e as TouchEvent).touches[0]!.clientX) ||
					(e as MouseEvent).clientX;
				let y =
					((e as TouchEvent).touches &&
						(e as TouchEvent).touches[0]!.clientY) ||
					(e as MouseEvent).clientY;
				x = Math.max(0, Math.min(x, window.innerWidth));
				y = Math.max(0, Math.min(y, window.innerHeight));
				let diffX = x - startX;
				let diffY = y - startY;
				if (
					!moved &&
					Math.abs(diffX) < DRAG_START_PX &&
					Math.abs(diffY) < DRAG_START_PX
				)
					return;

				dragElt!.style.transition = "none";
				let tX = (dragged.x = initial.x + diffX);
				let tY = (dragged.y = initial.y + diffY);
				dragElt!.style.transform = `translate(${tX}px, ${tY}px)`;
				moved = true;
				e.preventDefault();
				e.stopPropagation();
			}

			function upHandler(e: MouseEvent | TouchEvent) {
				if (moved) {
					e.preventDefault();
					e.stopPropagation();
					_draggedElements.set(dragElt!, dragged);
				}
				_dragStart = 0;
				removeAllListeners();
			}

			window.addEventListener("touchmove", moveHandler, true);
			window.addEventListener("mousemove", moveHandler, true);
			window.addEventListener("touchend", upHandler, true);
			window.addEventListener("mouseup", upHandler, true);
			window.addEventListener("click", upHandler, true);
		}

		element.addEventListener("mousedown", handlePress, { passive: false });
		element.addEventListener("touchstart", handlePress, { passive: false });
	},
};

/**
 * Drag relative effect - emits DragRelative events with position data.
 * - Only uses onRendered to add mouse/touch event listeners.
 * - Emits position data relative to element and parent container.
 */
const dragRelativeEffect: RenderEffect<HTMLElement> = {
	onRendered(view, output) {
		let element = output.element;
		if (!element || appliedDragRelative.has(element)) return;
		appliedDragRelative.add(element);

		let lastEvent: MouseEvent | TouchEvent | undefined;
		let lastRect: DOMRect | undefined;
		let lastParentRect: DOMRect | undefined;
		let lastWidth = 0;
		let lastHeight = 0;
		let lastParentWidth = 0;
		let lastParentHeight = 0;
		let lastScrollTop = 0;
		let lastScrollLeft = 0;
		let pending = false;
		let parentElts: HTMLElement[] | undefined;

		function findParentElts() {
			parentElts = [];
			let p = element.parentElement;
			while (p) {
				parentElts.unshift(p);
				let classes = p.className.split(/\s+/);
				if (classes.includes("__Cl")) return;
				p = p.parentElement;
			}
		}

		function handleMoveEvent(e: MouseEvent | TouchEvent) {
			if (!parentElts || !parentElts.length) return;
			let parentElt = parentElts[0] as HTMLElement;
			lastEvent = e;
			lastRect = element.getBoundingClientRect();
			lastParentRect = parentElt.getBoundingClientRect();
			lastWidth = element.scrollWidth;
			lastHeight = element.scrollHeight;
			lastParentWidth = parentElt.scrollWidth;
			lastParentHeight = parentElt.scrollHeight;
			lastScrollLeft = parentElts.reduce((s, p) => s + p.scrollLeft, 0);
			lastScrollTop = parentElts.reduce((s, p) => s + p.scrollTop, 0);
			if (pending) return;
			app.renderer!.schedule(() => {
				pending = false;
				if (!lastEvent || !lastRect || !lastParentRect) return;
				let clientX =
					(e as MouseEvent).clientX ?? (e as TouchEvent).touches[0]?.clientX;
				let clientY =
					(e as MouseEvent).clientY ?? (e as TouchEvent).touches[0]?.clientY;
				let left = clientX - lastRect.x + lastScrollLeft;
				let top = clientY - lastRect.y + lastScrollTop;
				let parentLeft = clientX - lastParentRect.x + lastScrollLeft;
				let parentTop = clientY - lastParentRect.y + lastScrollTop;
				view.emit("DragRelative", {
					event: lastEvent,
					left,
					top,
					parentLeft,
					parentTop,
					right: lastWidth - left,
					bottom: lastHeight - top,
					parentRight: lastParentWidth - parentLeft,
					parentBottom: lastParentHeight - parentTop,
				});
			}, true);
			pending = true;
		}

		function handleMouseDown() {
			findParentElts();
			function handleUp() {
				window.removeEventListener("mouseup", handleUp, true);
				window.removeEventListener("mousemove", handleMoveEvent, true);
			}
			window.addEventListener("mouseup", handleUp, true);
			window.addEventListener("mousemove", handleMoveEvent, true);
		}

		function handleTouchStart() {
			findParentElts();
			function handleUp() {
				window.removeEventListener("touchend", handleUp, true);
				window.removeEventListener("touchmove", handleMoveEvent, true);
			}
			window.addEventListener("touchend", handleUp, true);
			window.addEventListener("touchmove", handleMoveEvent, true);
		}

		element.addEventListener("mousedown", handleMouseDown);
		element.addEventListener("touchstart", handleTouchStart);
	},
};

/**
 * Registers drag effects for use in the application.
 * - The `drag-modal` effect can be used to drag a surrounding modal element by a 'handle' on which the effect is registered.
 * - The `drag-relative` effect can be used to emit drag events relative to the target element and its container element; see {@link WebRenderer.DragRelativeEvent}.
 * - Call this function after {@link useWebContext()} to enable drag effects, which also enables dragging of default message dialogs automatically.
 */
export function useDragEffects(): void {
	RenderEffect.register("drag-modal", dragModalEffect);
	RenderEffect.register("drag-relative", dragRelativeEffect);
}
