import { ObservedEvent, UIScrollContainer } from "@talla-ui/core";
import { UIContainerRenderer } from "./UIContainerRenderer.js";

const EMIT_INTERVAL = 100;

/** @internal */
export class UIScrollContainerRenderer extends UIContainerRenderer<UIScrollContainer> {
	override getOutput() {
		let out = super.getOutput();

		// add DOM onscroll handler
		out.element.addEventListener("scroll", this._makeDOMScrollHandler());

		// always make scroll container non-focusable
		// (app should provide other ways to enable keyboard navigation)
		out.element.tabIndex = -1;
		return out;
	}

	override updateStyle(element: HTMLElement) {
		super.updateStyle(element);

		// set scroll styles
		let { horizontalScrollEnabled, verticalScrollEnabled } = this.observed;
		element.style.overflowX = horizontalScrollEnabled ? "auto" : "";
		element.style.overflowY = verticalScrollEnabled ? "auto" : "";
	}

	onUIScrollTarget(
		e: ObservedEvent<
			UIScrollContainer,
			{ target?: string; xOffset: any; yOffset: any }
		>,
	) {
		let element = this.element;
		if (!element) return;
		if (e.data.target === "top") {
			element.scrollTo({ top: 0 });
		} else if (e.data.target === "bottom") {
			element.scrollTo({ top: element.scrollHeight });
		} else {
			element.scrollTo(e.data.xOffset, e.data.yOffset);
		}
	}

	private _makeDOMScrollHandler() {
		let lastTop = 0;
		let lastLeft = 0;
		let lastEventT = 0;
		let lastT = Date.now();
		let pending = false;
		let wentUp: boolean | undefined;
		let wentDown: boolean | undefined;
		let wentXStart: boolean | undefined;
		let wentXEnd: boolean | undefined;
		let checkAndEmit = () => {
			let element = this.element!;
			let scrollContainer = this.observed!;
			if (!scrollContainer) return;
			let tDiffSec = (Date.now() - lastT) / 1000;
			let vertDist = element.scrollTop - lastTop;
			let horzDist = Math.abs(element.scrollLeft) - lastLeft;
			if (vertDist < 0) wentDown = !(wentUp = true);
			if (vertDist > 0) wentDown = !(wentUp = false);
			if (horzDist < 0) wentXEnd = !(wentXStart = true);
			if (horzDist > 0) wentXEnd = !(wentXStart = false);
			lastTop = element.scrollTop;
			lastLeft = Math.abs(element.scrollLeft);
			lastT = Date.now();
			let eventData: UIScrollContainer.ScrollEventData = {
				yOffset: lastTop,
				xOffset: lastLeft,
				scrolledDown: wentDown,
				scrolledUp: wentUp,
				scrolledHorizontalStart: wentXStart,
				scrolledHorizontalEnd: wentXEnd,
				atTop: lastTop <= scrollContainer.topThreshold,
				atHorizontalStart: lastLeft <= scrollContainer.horizontalThreshold,
				atBottom:
					lastTop + element.clientHeight >=
					element.scrollHeight - scrollContainer.bottomThreshold,
				atHorizontalEnd:
					lastLeft + element.clientWidth >=
					element.scrollWidth - scrollContainer.horizontalThreshold,
				verticalVelocity:
					Math.abs(vertDist / (window.innerHeight || 1)) / (tDiffSec || 0.1),
				horizontalVelocity:
					Math.abs(horzDist / (window.innerWidth || 1)) / (tDiffSec || 0.1),
			};
			scrollContainer.emit("Scroll", eventData);
			if (lastEventT < lastT - EMIT_INTERVAL) {
				scrollContainer.emit("ScrollEnd", eventData);
				pending = false;
			} else {
				setTimeout(checkAndEmit, EMIT_INTERVAL);
				pending = true;
			}
		};
		return () => {
			lastEventT = Date.now();
			if (!pending) checkAndEmit();
		};
	}
}
