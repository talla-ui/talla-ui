import type { View, ViewBuilder } from "../../app/index.js";
import { ObservedEvent } from "../../object/index.js";
import { UIContainer } from "./UIContainer.js";

/** @internal Helper function to emit a scroll event */
function emitScroll(source: View, name: string, data: any) {
	source.emit(
		new ObservedEvent(name, source, data, undefined, undefined, true),
	);
}

/**
 * A view class that represents a container element that allows users to scroll, emitting asynchronous scroll events
 *
 * @description A scroll container functions like a regular container element, but allows users to scroll horizontally and/or vertically.
 *
 * @online_docs Refer to the online documentation for more documentation on using this UI element class.
 */
export class UIScrollContainer extends UIContainer {
	/**
	 * Creates a new {@link ViewBuilder} instance for the current view class
	 * @see {@link View.getViewBuilder}
	 * @docgen {hide}
	 */
	declare static getViewBuilder: (
		preset: ViewBuilder.ExtendPreset<
			typeof UIContainer,
			UIScrollContainer,
			| "topThreshold"
			| "bottomThreshold"
			| "horizontalThreshold"
			| "verticalScrollEnabled"
			| "horizontalScrollEnabled"
		> & {
			/** Event that's emitted when the visible area is scrolled, a {@link UIScrollContainer.ScrollEvent} */
			onScroll?: string;
			/** Event that's emitted after the visible area has been scrolled, a {@link UIScrollContainer.ScrollEvent} */
			onScrollEnd?: string;
		},
		...content: ViewBuilder[]
	) => ViewBuilder<UIContainer>;

	/** Creates a new scroll container view object with the provided view content */
	constructor(...content: View[]) {
		super(...content);
	}

	/** Vertical threshold (in pixels) until which `UIScrollEvent.atTop` is set, defaults to 0 */
	topThreshold = 0;

	/** Vertical threshold (in pixels) until which `UIScrollEvent.atBottom` is set, defaults to 0 */
	bottomThreshold = 0;

	/** Horizontal threshold (in pixels) until which `UIScrollEvent.atHorizontalStart` or `UIScrollEvent.atHorizontalEnd` is set, defaults to 0 */
	horizontalThreshold = 0;

	/** True if vertical scrolling should be enabled if necessary, defaults to true */
	verticalScrollEnabled = true;

	/** True if horizontal scrolling should be enabled if necessary, defaults to true */
	horizontalScrollEnabled = true;

	/**
	 * Scrolls to the specified pair of vertical and horizontal offset values
	 * @note Positioning is platform dependent and may also change with text direction. Use only offset values taken from {@link UIScrollContainer.ScrollEventData}.
	 */
	scrollTo(yOffset?: number, xOffset?: number) {
		emitScroll(this, "UIScrollTarget", { yOffset, xOffset });
	}

	/**
	 * Scroll to the top of the scrollable content, if possible
	 * - This action may be handled asynchronously, and may not take effect immediately.
	 */
	scrollToTop() {
		emitScroll(this, "UIScrollTarget", { target: "top" });
	}

	/**
	 * Scroll to the bottom of the scrollable content, if possible
	 * - This action may be handled asynchronously, and may not take effect immediately.
	 */
	scrollToBottom() {
		emitScroll(this, "UIScrollTarget", { target: "bottom" });
	}
}

export namespace UIScrollContainer {
	/**
	 * Type definition for an event that's emitted when the user scrolls up, down, left, or right in a {@link UIScrollContainer}
	 * - Scroll events are emitted either as `Scroll` or `ScrollEnd` events. The latter is emitted after the user has stopped scrolling.
	 */
	export type ScrollEvent = ObservedEvent<UIScrollContainer, ScrollEventData>;

	/**
	 * The data structure contained by each {@link UIScrollContainer.ScrollEvent}
	 * - The platform dependent offsets `xOffset` and `yOffset` can be saved and restored later using {@link UIScrollContainer.scrollTo()}. These should not be used for any other purpose.
	 * - The `horizontalVelocity` and `verticalVelocity` (a number representing the approximate screen widths/heights per second), and `scrolledUp`, `scrolledDown`, `scrolledHorizontalStart`, `scrolledHorizontalEnd` (booleans) values are platform independent and represent the last scroll movement.
	 * - The boolean values of `atTop`, `atBottom`, `atHorizontalStart`, and `atHorizontalEnd` represent the current position. These are affected by the threshold values set on the {@link UIScrollContainer} instance itself — e.g. with a top threshold of 5 pixels, the `atTop` value remains true while the container is scrolled within 0-5 pixels from the top of its content.
	 */
	export type ScrollEventData = {
		/** Vertical scroll offset; platform-dependent value, should not be used for positioning but can be used with `UIScrollContainer.scrollTo()` */
		yOffset: number;

		/** Horizontal scroll offset; platform-dependent value, may change with text direction, should not be used for positioning but can be used with `UIScrollContainer.scrollTo()` */
		xOffset: number;

		/** Horizontal scrolling velocity (screen widths per second) */
		horizontalVelocity: number;

		/** Horizontal scrolling velocity (screen heights per second) */
		verticalVelocity: number;

		/** True if (last) scrolled down */
		scrolledDown?: boolean;

		/** True if (last) scrolled up */
		scrolledUp?: boolean;

		/** True if (last) scrolled left for LTR text direction, right for RTL */
		scrolledHorizontalStart?: boolean;

		/** True if (last) scrolled right for LTR text direction, left for RTL */
		scrolledHorizontalEnd?: boolean;

		/** True if the scroll container is scrolled to the top */
		atTop?: boolean;

		/** True if the scroll container is scrolled to the bottom */
		atBottom?: boolean;

		/** True if the scroll container is scrolled to the left for LTR text direction, right for RTL */
		atHorizontalStart?: boolean;

		/** True if the scroll container is scrolled to the right for LTR text direction, left for RTL */
		atHorizontalEnd?: boolean;
	};
}
