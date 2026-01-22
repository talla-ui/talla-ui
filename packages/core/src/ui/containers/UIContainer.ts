import { View, ViewBuilder, ViewBuilderEventHandler } from "../../app/index.js";
import { BindingOrValue, ObservableList } from "../../object/index.js";
import { StyleOverrides, UIColor } from "../style/index.js";
import { UIElement } from "../UIElement.js";

/**
 * A base view class that represents a container element with no specific layout or styling
 *
 * @online_docs Refer to the online documentation for more information on using this UI element class.
 */
export abstract class UIContainer extends UIElement {
	/**
	 * Options related to layout of content UI elements within this container
	 * - These options _override_ the defaults for the type of container.
	 */
	layout?: Readonly<UIContainer.Layout> = undefined;

	/**
	 * True if this container may receive direct input focus.
	 * - This property can't be changed after rendering.
	 */
	allowFocus?: boolean;

	/**
	 * True if this container may receive input focus using the keyboard (e.g. Tab key).
	 * - This property can't be changed after rendering.
	 * - If this property is set to true, allowFocus is assumed to be true as well.
	 */
	allowKeyboardFocus?: boolean;

	/**
	 * True if hover state should be tracked for this container.
	 * - Defaults to false. This property is automatically enabled when mouse enter/leave handlers are added using {@link UIContainer.ContainerBuilder.onMouseEnter onMouseEnter()} or {@link UIContainer.ContainerBuilder.onMouseLeave onMouseLeave()}.
	 */
	trackHover?: boolean;

	/**
	 * Returns true if this container is currently hovered by the mouse.
	 * - Only works when {@link trackHover} is enabled.
	 */
	isHovered(): boolean {
		return !!this.getRenderer()?.isHovered?.();
	}

	/** The list of all (attached) content view objects */
	readonly content = this.attach(
		new ObservableList<View>().attachItems(true),
		(event) => {
			if (event.source instanceof View && !event.noPropagation) {
				this.emit(event);
			}
		},
	);

	/** Implementation of {@link View.findViewContent()} that searches within this container */
	override findViewContent<T extends View>(
		type: new (...args: any[]) => T,
	): T[] {
		let match: any[] = [];
		for (let c of this.content) {
			if (c instanceof type) match.push(c);
			else match.push(...c.findViewContent(type));
		}
		return match;
	}
}

export namespace UIContainer {
	/** Options for layout of UI elements within a container */
	export type Layout = {
		/** Axis along which content is distributed (defaults to vertical) */
		axis?: "horizontal" | "vertical" | "";
		/** Positioning of content along the distribution axis (defaults to start) */
		distribution?:
			| "start"
			| "end"
			| "center"
			| "space-between"
			| "space-around"
			| "";
		/** Positioning of content perpendicular to the distribution axis (defaults to stretch) */
		gravity?: "start" | "end" | "center" | "stretch" | "baseline" | "";
		/** True if content should wrap to new line/column if needed (defaults to false) */
		wrapContent?: boolean;
		/** True if content should be clipped within this container */
		clip?: boolean;
		/** Options for separator between each UI element */
		separator?: Readonly<SeparatorOptions>;
		/** Padding around contained UI elements, in pixels or CSS length with unit, **or** an object with separate offset values */
		padding?: StyleOverrides.Offsets;
	};

	/**
	 * Options for the appearance of container separators
	 * @see {@link UIContainer.Layout}
	 */
	export type SeparatorOptions = {
		/** Width/height of separator space (CSS length or pixels) */
		space?: string | number;
		/** Separator line width (CSS length or pixels) */
		lineWidth?: string | number;
		/** Line separator color, defaults to `separator` */
		lineColor?: UIColor;
		/** Line separator margin (CSS length or pixels) */
		lineMargin?: string | number;
		/** True for vertical line */
		vertical?: boolean;
	};

	/**
	 * An abstract builder class for `UIContainer` instances.
	 * @note This class is used as a base class for container builders, such as the ones returned by `UI.Column()` and `UI.Row()`. You should not use this class directly.
	 */
	export abstract class ContainerBuilder<
		T extends UIContainer = UIContainer,
	> extends UIElement.ElementBuilder<T> {
		/**
		 * Adds content to the container.
		 * @param builders An array of view builders for the content elements.
		 * @returns The builder instance for chaining.
		 */
		with(...builders: Array<ViewBuilder | undefined>) {
			if (builders.length) {
				this.initializer.finalize((view) => {
					let content: View[] = [];
					for (let b of builders) b && content.push(b.build());
					view.content.add(...content);
				});
			}
			return this;
		}

		/**
		 * Sets the layout options for the container, using {@link UIContainer.layout}.
		 * @param layout A {@link UIContainer.Layout} object or a binding.
		 * @returns The builder instance for chaining.
		 */
		layout(layout?: BindingOrValue<UIContainer.Layout | undefined>) {
			return this.setProperty("layout", layout);
		}

		/**
		 * Enables or disables content wrapping.
		 * - This method updates the {@link UIContainer.layout layout} property.
		 * @param wrapContent If `true`, content will wrap. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		wrapContent(wrapContent: BindingOrValue<boolean> = true) {
			this.initializer.update(wrapContent, function (value) {
				this.layout = { ...this.layout, wrapContent: value };
			});
			return this;
		}

		/**
		 * Enables or disables content clipping.
		 * - This method updates the {@link UIContainer.layout layout} property.
		 * @param clip If `true`, content will be clipped. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		clip(clip: BindingOrValue<boolean> = true) {
			this.initializer.update(clip, function (value) {
				this.layout = { ...this.layout, clip: value };
			});
			return this;
		}

		/**
		 * Allows the container to receive input focus.
		 * @param allow If `true`, the container can be focused. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		allowFocus(allow = true) {
			return this.setProperty("allowFocus", allow);
		}

		/**
		 * Allows the container to receive input focus via the keyboard.
		 * @param allow If `true`, the container can be focused with the keyboard. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		allowKeyboardFocus(allow = true) {
			if (allow) this.allowFocus(true);
			return this.setProperty("allowKeyboardFocus", allow);
		}

		/**
		 * Enables hover state tracking for this container.
		 * @param track If `true`, hover state will be tracked. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		trackHover(track = true) {
			return this.setProperty("trackHover", track);
		}

		/**
		 * Handles the `MouseEnter` event.
		 * - Automatically enables hover tracking.
		 * @param handle The function to call, or name of the event to emit instead.
		 * @see {@link UIElement.ElementBuilder.handle()}
		 */
		onMouseEnter(handle: string | ViewBuilderEventHandler<T>) {
			this.trackHover(true);
			return this.handle("MouseEnter", handle);
		}

		/**
		 * Handles the `MouseLeave` event.
		 * - Automatically enables hover tracking.
		 * @param handle The function to call, or name of the event to emit instead.
		 * @see {@link UIElement.ElementBuilder.handle()}
		 */
		onMouseLeave(handle: string | ViewBuilderEventHandler<T>) {
			this.trackHover(true);
			return this.handle("MouseLeave", handle);
		}

		/**
		 * Centers content both horizontally and vertically.
		 * - Shorthand for `.align("center", "center")`.
		 * @returns The builder instance for chaining.
		 */
		center() {
			this.initializer.update(undefined, function () {
				this.layout = {
					...this.layout,
					gravity: "center",
					distribution: "center",
				};
			});
			return this;
		}

		/**
		 * Applies flex-fill behavior with stacking context.
		 * - Sets grow to 1, minHeight to 0, clips overflow, stretches to fill parent, and creates a stacking context (zIndex: 0).
		 * @returns The builder instance for chaining.
		 */
		stretch() {
			return this.grow(1)
				.minHeight(0)
				.clip(true)
				.position({ gravity: "stretch", zIndex: 0 });
		}
	}
}
