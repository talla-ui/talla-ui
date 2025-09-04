import { ViewBuilder } from "../../app/index.js";
import { BindingOrValue, ObservableEvent } from "../../object/index.js";
import { UIContainer } from "./UIContainer.js";

/**
 * A view class that represents a container element that allows users to scroll, emitting asynchronous scroll events
 *
 * @description A scroll view functions like a regular container element, but allows users to scroll horizontally and/or vertically.
 *
 * @online_docs Refer to the online documentation for more information on using this UI element class.
 */
export class UIScrollView extends UIContainer {
	/** Vertical threshold (in pixels) until which `UIScrollEvent.atTop` is set, defaults to 0 */
	topThreshold = 0;

	/** Vertical threshold (in pixels) until which `UIScrollEvent.atBottom` is set, defaults to 0 */
	bottomThreshold = 0;

	/** Horizontal threshold (in pixels) until which `UIScrollEvent.atHorizontalStart` or `UIScrollEvent.atHorizontalEnd` is set, defaults to 0 */
	horizontalThreshold = 0;

	/** True if vertical scrolling should be enabled if necessary, defaults to true */
	verticalScroll = true;

	/** True if horizontal scrolling should be enabled if necessary, defaults to true */
	horizontalScroll = true;

	/**
	 * Scrolls to the specified pair of vertical and horizontal offset values
	 * @note Positioning is platform dependent and may also change with text direction. Use only offset values taken from {@link UIScrollView.ScrollEventData}.
	 */
	scrollTo(yOffset?: number, xOffset?: number) {
		this.emit(
			new ObservableEvent(
				"UIScrollTarget",
				this,
				{ yOffset, xOffset },
				undefined,
				true,
			),
		);
	}

	/**
	 * Scroll to the top of the scrollable content, if possible
	 * - This action may be handled asynchronously, and may not take effect immediately.
	 */
	scrollToTop() {
		this.emit(
			new ObservableEvent(
				"UIScrollTarget",
				this,
				{ target: "top" },
				undefined,
				true,
			),
		);
	}

	/**
	 * Scroll to the bottom of the scrollable content, if possible
	 * - This action may be handled asynchronously, and may not take effect immediately.
	 */
	scrollToBottom() {
		this.emit(
			new ObservableEvent(
				"UIScrollTarget",
				this,
				{ target: "bottom" },
				undefined,
				true,
			),
		);
	}
}

export namespace UIScrollView {
	/**
	 * Type definition for an event that's emitted when the user scrolls up, down, left, or right in a {@link UIScrollView}
	 * - Scroll events are emitted either as `Scroll` or `ScrollEnd` events. The latter is emitted after the user has stopped scrolling.
	 */
	export type ScrollEvent = ObservableEvent<UIScrollView, ScrollEventData>;

	/**
	 * The data structure contained by each {@link UIScrollView.ScrollEvent}
	 * - The platform dependent offsets `xOffset` and `yOffset` can be saved and restored later using {@link UIScrollView.scrollTo()}. These should not be used for any other purpose.
	 * - The `horizontalVelocity` and `verticalVelocity` (a number representing the approximate screen widths/heights per second), and `scrolledUp`, `scrolledDown`, `scrolledHorizontalStart`, `scrolledHorizontalEnd` (booleans) values are platform independent and represent the last scroll movement.
	 * - The boolean values of `atTop`, `atBottom`, `atHorizontalStart`, and `atHorizontalEnd` represent the current position. These are affected by the threshold values set on the {@link UIScrollView} instance itself — e.g. with a top threshold of 5 pixels, the `atTop` value remains true while the container is scrolled within 0-5 pixels from the top of its content.
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

	export type ContentBuilder = ViewBuilder & {
		with(...content: ViewBuilder[]): void;
	};

	/**
	 * A builder for `UIScrollView` instances.
	 * @note This builder is used to create scrollable container views.
	 * It is typically not used directly, but rather through the `.scroll()` method
	 * on builders created by `UI.Column()` and `UI.Row()`.
	 */
	export class ScrollViewBuilder extends UIContainer.ContainerBuilder<UIScrollView> {
		constructor() {
			super();
			this.initializer.finalize((scrollView) => {
				let content = this.content?.build();
				if (content) scrollView.content.add(content);
			});
		}

		/** The initializer that is used to create each scroll view instance */
		readonly initializer = new ViewBuilder.Initializer(UIScrollView);

		/** The builder for the content within the scroll view. */
		content?: UIScrollView.ContentBuilder;

		/**
		 * Sets the content of the scroll view.
		 * @note This method is used by `.scroll()` builder methods, and should not be called directly.
		 * @param content A {@link ViewBuilder} for the content.
		 * @returns The builder instance for chaining.
		 */
		setContent(content: UIScrollView.ContentBuilder) {
			this.content = content;
			return this;
		}

		/**
		 * Adds content to the scroll view's _inner_ container.
		 * @note This method overrides the default container implementation, in order to add the content to the scroll view's _inner_ container, i.e. the row or column that is being wrapped.
		 * @param content An array of view builders for the content elements.
		 * @returns The builder instance for chaining.
		 */
		override with(...content: ViewBuilder[]) {
			if (!this.content) throw RangeError();
			this.content.with(...content);
			return this;
		}

		/**
		 * Sets the threshold (in pixels) for the `atTop` flag.
		 * @param topThreshold The threshold value.
		 * @returns The builder instance for chaining.
		 * @see {@link UIScrollView.topThreshold}
		 * @see {@link UIScrollView.ScrollEventData}
		 */
		topThreshold(topThreshold: BindingOrValue<number>) {
			return this.setProperty("topThreshold", topThreshold);
		}

		/**
		 * Sets the threshold (in pixels) for the `atBottom` flag.
		 * @param bottomThreshold The threshold value.
		 * @returns The builder instance for chaining.
		 * @see {@link UIScrollView.bottomThreshold}
		 * @see {@link UIScrollView.ScrollEventData}
		 */
		bottomThreshold(bottomThreshold: BindingOrValue<number>) {
			return this.setProperty("bottomThreshold", bottomThreshold);
		}

		/**
		 * Sets the threshold (in pixels) for the `atHorizontalStart` and `atHorizontalEnd` flags.
		 * @param horizontalThreshold The threshold value.
		 * @returns The builder instance for chaining.
		 * @see {@link UIScrollView.horizontalThreshold}
		 * @see {@link UIScrollView.ScrollEventData}
		 */
		horizontalThreshold(horizontalThreshold: BindingOrValue<number>) {
			return this.setProperty("horizontalThreshold", horizontalThreshold);
		}

		/**
		 * Enables or disables vertical scrolling, using {@link UIScrollView.verticalScroll}.
		 * @param verticalScroll If `true`, vertical scrolling is enabled. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		verticalScroll(verticalScroll: BindingOrValue<boolean> = true) {
			return this.setProperty("verticalScroll", verticalScroll);
		}

		/**
		 * Enables or disables horizontal scrolling, using {@link UIScrollView.horizontalScroll}.
		 * @param horizontalScroll If `true`, horizontal scrolling is enabled. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		horizontalScroll(horizontalScroll: BindingOrValue<boolean> = true) {
			return this.setProperty("horizontalScroll", horizontalScroll);
		}

		/**
		 * Handles the `Scroll` event
		 * @param handle The function to call, or name of the event to emit instead
		 * @see {@link UIElement.ElementBuilder.handle()}
		 */
		onScroll(
			handle:
				| string
				| ((event: UIScrollView.ScrollEvent, object: UIScrollView) => void),
		) {
			return this.handle("Scroll", handle as any);
		}

		/**
		 * Handles the `ScrollEnd` event
		 * @param handle The function to call, or name of the event to emit instead
		 * @see {@link UIElement.ElementBuilder.handle()}
		 */
		onScrollEnd(
			handle:
				| string
				| ((event: UIScrollView.ScrollEvent, object: UIScrollView) => void),
		) {
			return this.handle("ScrollEnd", handle as any);
		}
	}
}
