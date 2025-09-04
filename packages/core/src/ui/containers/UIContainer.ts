import { View, ViewBuilder } from "../../app/index.js";
import { BindingOrValue, ObservableList } from "../../object/index.js";
import { UIColor, UIStyle } from "../style/index.js";
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
		padding?: UIStyle.Offsets;
	};

	/**
	 * Options for the appearance of container separators
	 * @see {@link UIContainer.Layout}
	 */
	export type SeparatorOptions = {
		/** True for vertical line, or width-only spacer */
		vertical?: boolean;
		/** Width/height of separator space (CSS length or pixels) */
		space?: string | number;
		/** Separator line width (CSS length or pixels) */
		lineWidth?: string | number;
		/** Line separator color, defaults to `separator` */
		lineColor?: UIColor;
		/** Line separator margin (CSS length or pixels) */
		lineMargin?: string | number;
	};

	/**
	 * An abstract builder class for `UIContainer` instances.
	 * @note This class is used as a base class for container builders, such as the ones returned by `UI.Cell()` and `UI.Column()`. You should not use this class directly.
	 */
	export abstract class ContainerBuilder<
		T extends UIContainer,
	> extends UIElement.ElementBuilder<T> {
		/**
		 * Adds content to the container.
		 * @param builders An array of view builders for the content elements.
		 * @returns The builder instance for chaining.
		 */
		with(...builders: ViewBuilder[]) {
			if (builders.length) {
				this.initializer.finalize((view) => {
					view.content.add(...builders.map((b) => b.build()));
				});
			}
			return this;
		}

		/**
		 * Applies a style to the container
		 * @param style A {@link UIStyle} instance, a style options (overrides) object, or a binding.
		 * @returns The builder instance for chaining.
		 */
		style(style?: BindingOrValue<UIStyle | UIStyle.StyleOptions | undefined>) {
			return this.setStyleProperty(style);
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
	}
}
