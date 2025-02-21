import { ObservedList } from "../../base/index.js";
import { View, type ViewBuilder } from "../../app/index.js";
import { UIComponent } from "../UIComponent.js";
import type { UIColor } from "../UIColor.js";

/**
 * A base view class that represents a container component with no specific layout or styling
 *
 * @online_docs Refer to the online documentation for more documentation on using this UI component class.
 */
export abstract class UIContainer extends UIComponent {
	/**
	 * Creates a new {@link ViewBuilder} instance for the current view class
	 * @see {@link View.getViewBuilder}
	 * @docgen {hide}
	 */
	static override getViewBuilder(
		preset: ViewBuilder.ExtendPreset<
			typeof UIComponent,
			UIContainer,
			"padding" | "layout"
		>,
		...content: ViewBuilder[]
	) {
		let b = super.getViewBuilder(preset) as ViewBuilder<UIContainer>;
		return b.addInitializer((container) => {
			container.content.add(...content.map((b) => b.create()));
		});
	}

	/** Creates a new container view object with the provided view content */
	constructor(...content: View[]) {
		super();

		// create content list and delegate events
		this.content = this.attach(new ObservedList(), (event) => {
			if (event.source instanceof View && !event.noPropagation) {
				this.emit(event);
			}
		});

		// add the provided content
		if (content.length) this.content.add(...content);
	}

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

	/** The list of all content view objects */
	declare readonly content: ObservedList<View>;

	/**
	 * Padding around contained elements, in pixels or CSS length with unit, **or** an object with separate offset values
	 * - If this property is set, its value overrides `padding` from the {@link layout} object.
	 */
	padding?: UIComponent.Offsets = undefined;

	/**
	 * Options related to layout of content components within this container
	 * - These options _override_ the defaults for the type of container.
	 */
	layout?: Readonly<UIContainer.Layout> = undefined;
}

export namespace UIContainer {
	/** Options for layout of components within a container */
	export type Layout = {
		/** Axis along which content is distributed (defaults to vertical) */
		axis?: "horizontal" | "vertical" | "";
		/** Positioning of content along the distribution axis (defaults to start) */
		distribution?: "start" | "end" | "center" | "fill" | "space-around" | "";
		/** Positioning of content perpendicular to the distribution axis (defaults to stretch) */
		gravity?: "start" | "end" | "center" | "stretch" | "baseline" | "";
		/** True if content should wrap to new line/column if needed (defaults to false) */
		wrapContent?: boolean;
		/** True if content should be clipped within this container */
		clip?: boolean;
		/** Options for separator between each component */
		separator?: Readonly<SeparatorOptions>;
		/** Padding around contained elements, in pixels or CSS length with unit, **or** an object with separate offset values */
		padding?: UIComponent.Offsets;
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
		/** Separator line thickness (CSS length or pixels) */
		lineThickness?: string | number;
		/** Line separator color, defaults to `separator` */
		lineColor?: UIColor;
		/** Line separator margin (CSS length or pixels) */
		lineMargin?: string | number;
	};
}
