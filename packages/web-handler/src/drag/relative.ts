import { app, ObservableEvent, UIElement } from "@talla-ui/core";

/**
 * @internal Adds a listener to the specified builder to allow dragging of the element, emitting relative position change events
 * @note This function is exported by {@link WebRenderer}.
 */
export function applyDragRelative(
	builder: UIElement.ElementBuilder<UIElement>,
) {
	builder.initializer.finalize((view) => {
		view.listen((e: ObservableEvent) => {
			if (e.name !== "Rendered") return;
			let element = view.lastRenderOutput?.element as HTMLElement;
			if (!element) return;

			if (element.dataset.appliedDragRelativeEffect) return;
			element.dataset.appliedDragRelativeEffect = "true";
			element.addEventListener("mousedown", handleMouseDown);
			element.addEventListener("touchstart", handleTouchStart);

			function handleMouseDown() {
				findParentElts();
				window.addEventListener("mouseup", handleUpEvent, { capture: true });
				window.addEventListener("mousemove", handleMoveEvent, {
					capture: true,
				});
			}

			function handleTouchStart() {
				findParentElts();
				window.addEventListener("touchend", handleUpEvent, { capture: true });
				window.addEventListener("touchmove", handleMoveEvent, {
					capture: true,
				});
			}

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

			function handleUpEvent() {
				window.removeEventListener("mouseup", handleUpEvent, { capture: true });
				window.removeEventListener("mousemove", handleMoveEvent, {
					capture: true,
				});
				window.removeEventListener("touchend", handleUpEvent, {
					capture: true,
				});
				window.removeEventListener("touchmove", handleMoveEvent, {
					capture: true,
				});
			}
		});
	});
	return builder;
}
