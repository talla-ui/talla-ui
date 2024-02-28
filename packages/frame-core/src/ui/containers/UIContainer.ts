import {
	ManagedChangeEvent,
	ManagedEvent,
	ManagedList,
	Observer,
} from "../../base/index.js";
import type {
	RenderContext,
	View,
	ViewClass,
	ViewEvent,
} from "../../app/index.js";
import { UIComponent } from "../UIComponent.js";
import type { UIColor } from "../UIColor.js";

/**
 * A base view class that represents a container component with no specific layout or styling
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export abstract class UIContainer extends UIComponent {
	/** Creates a new container view object with the provided view content */
	constructor(...content: View[]) {
		super();

		// create content list and delegate events
		class ContentObserver extends Observer<ManagedList<View>> {
			constructor(public container: UIContainer) {
				super();
			}
			protected override handleEvent(event: ManagedEvent) {
				this.container.delegateContentEvent(event);
			}
		}
		this.content = this.attach(new ManagedList(), new ContentObserver(this));

		// add the provided content
		if (content.length) this.content.add(...content);
	}

	/**
	 * Applies the provided preset properties to this object
	 * - This method is called automatically. Do not call this method after constructing a UI component.
	 */
	override applyViewPreset(
		preset: View.ViewPreset<
			UIComponent,
			this,
			"layout" | "padding" | "spacing"
		> & {
			/** True if this container *itself* may receive direct input focus using the mouse, touch, or using `UIComponent.requestFocus` */
			allowFocus?: boolean;
			/** True if this container *itself* may receive input focus using the keyboard and all other methods */
			allowKeyboardFocus?: boolean;
			/** True if all content views should be rendered asynchronously (results in smoother updates with slightly longer lead times) */
			asyncContentRendering?: boolean;
			/** Event that's emitted by the container renderer when content is being rendered */
			onContentRendering?: string;
		},
	) {
		if (preset.allowKeyboardFocus) preset.allowFocus = true;
		super.applyViewPreset(preset);
	}

	/** Implementation of {@link View.findViewContent()} that searches within this container */
	override findViewContent<T extends View>(type: ViewClass<T>): T[] {
		let match: any[] = [];
		for (let c of this.content) {
			if (c instanceof type) match.push(c);
			else match.push(...c.findViewContent(type));
		}
		return match;
	}

	/**
	 * Delegates events from content view objects
	 * - This method is called automatically when an event is emitted by any of the content view objects.
	 * - For most events (see below), the base implementation re-emits the same event on the container view itself; or a new event object with `delegate` property set to the container, if the `emitDelegate` parameter is set to true.
	 * - Events not re-emitted include (list) change events, renderer events (@link RenderContext.RendererEvent), and cell MouseEnter and MouseLeave events.
	 * - This method may be overridden to handle events in any other way.
	 * @param event The event to be delegated (from a content view object)
	 * @returns True if the event has been re-emitted
	 */
	protected delegateContentEvent(event: ManagedEvent, emitDelegate?: boolean) {
		// propagate all events from components except renderer events
		// AND MouseEnter / MouseLeave events so that UICell components
		// do not emit these events for content components, only themselves
		if (
			!(event as ManagedChangeEvent).isChangeEvent &&
			!(event as RenderContext.RendererEvent).isRendererEvent &&
			event.name !== "MouseEnter" &&
			event.name !== "MouseLeave"
		) {
			if (emitDelegate) {
				event = new ManagedEvent(
					event.name,
					event.source,
					event.data,
					this,
					event,
				);
			}
			this.emit(event);
			return true;
		}
	}

	/** The list of all content view objects */
	declare readonly content: ManagedList<View>;

	/**
	 * Options related to layout of content components within this container
	 * - These options _override_ the defaults for the type of container.
	 */
	layout?: Readonly<UIContainer.Layout> = undefined;

	/**
	 * Padding around contained elements, in pixels or CSS length with unit, **or** an object with separate offset values
	 * - If this property is set on a {@link UICell}, its value overrides `padding` from the current cell style.
	 */
	padding?: UIComponent.Offsets = undefined;

	/**
	 * Space between components, in pixels or CSS length with unit
	 * - This property is only set by default on {@link UIRow}, to apply {@link UITheme.rowSpacing}.
	 * - If this property is set, its value overrides `separator` from the current {@link layout} object.
	 */
	spacing?: string | number = undefined;

	/**
	 * True if content views should be rendered asynchronously
	 * - Setting this property to true should result in smoother updates, especially for containers with many content items. However, for containers with fewer, larger items, content view rendering may be delayed by a few milliseconds which may result in visual artifacts.
	 */
	asyncContentRendering?: boolean;

	/**
	 * True if this container *itself* may receive direct input focus
	 * - This property can't be changed after rendering.
	 */
	allowFocus?: boolean;

	/**
	 * True if this container *itself* may receive input focus using the keyboard (e.g. Tab key)
	 * - This property can't be changed after rendering.
	 * - If this property is set to true, allowFocus is assumed to be true as well and no longer checked.
	 */
	allowKeyboardFocus?: boolean;
}

export namespace UIContainer {
	/** Type definition for an event that's emitted (only) on a container when content is being rendered */
	export type ContentRenderingEvent<
		TContainer extends UIContainer = UIContainer,
	> = RenderContext.RendererEvent &
		ViewEvent<
			TContainer,
			{ output: Array<RenderContext.Output | undefined> },
			"ContentRendering"
		>;

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
