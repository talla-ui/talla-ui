import {
	ManagedChangeEvent,
	ManagedEvent,
	ManagedList,
	Observer,
} from "../../core/index.js";
import type { RenderContext, View, ViewClass } from "../../app/index.js";
import { UIStyle } from "../UIStyle.js";
import { UIComponent, UIComponentEvent } from "../UIComponent.js";

/**
 * A base view class that represents a container component with no specific layout or styling
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export abstract class UIContainer extends UIComponent {
	/**
	 * Creates a preset view class for a UI container component
	 *
	 * @summary This static method returns a new constructor, that applies the provided property values, bindings, and event handlers to all instances of the resulting view class.
	 *
	 * Refer to {@link UIComponent.with()} for details.
	 *
	 * @param preset Property values, bindings, and event handlers
	 * @param content A list of view classes to be constructed as the content for each container
	 * @returns A class that can be used to create instances with the provided property values, bindings, and event handlers.
	 */
	static override with<TViewClass, TComponent extends UIComponent>(
		this: TViewClass & (new (...args: any[]) => TComponent),
		preset: UIComponent.ViewPreset<TComponent, any, never>,
		...content: Array<ViewClass | undefined>
	): TViewClass;
	static override with<TViewClass>(
		this: TViewClass,
		...content: Array<ViewClass | undefined>
	): TViewClass;
	static override with(...presets: any[]): any {
		let preset: any;
		if (typeof presets[0] !== "function") {
			// first arg is a preset properties object
			preset = presets.shift();
		}
		return class PresetUIContainer extends (this as any) {
			constructor(...args: View[]) {
				super();

				// apply preset properties
				if (preset) this.applyViewPreset({ ...preset });

				// add preset or constructor content
				if (presets.length) {
					for (let C of presets) {
						if (C) this.content.add(new C());
					}
				} else if (args.length) {
					this.content.add(...args);
				}
			}
		};
	}

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
		preset: UIComponent.ViewPreset<
			UIComponent,
			this,
			"distribution" | "padding" | "spacing"
		> & {
			/** Options for layout of content components within this container (overrides) */
			layout?: UIStyle.Definition.ContainerLayout;
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
		let layout = preset.layout;
		delete preset.layout;
		if (preset.allowKeyboardFocus) preset.allowFocus = true;

		super.applyViewPreset(preset);

		// apply style overrides
		if (layout) this.layout = { ...this.layout, ...layout };
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

	protected override applyStyle(style: UIStyle) {
		super.applyStyle(style);
		this.layout = style.getStyles().containerLayout;
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

	/** Style definitions related to layout of content components within this container */
	layout!: Readonly<UIStyle.Definition.ContainerLayout>;

	/**
	 * Distribution of content along the container's primary axis
	 * - If this property is set, its value overrides `distribution` from the current style's {@link UIStyle.Definition.ContainerLayout} object.
	 */
	distribution?: UIStyle.Definition.ContainerLayout["distribution"] = undefined;

	/**
	 * Space between components, in pixels or CSS length with unit
	 * - This property is only set by default on {@link UIRow}, to apply {@link UITheme.rowSpacing}.
	 * - If this property is set, its value overrides `separator` from the current style's {@link UIStyle.Definition.ContainerLayout} object.
	 * - To apply another separator style, use the {@link UIStyle.Definition.ContainerLayout} object.
	 */
	spacing?: string | number = undefined;

	/**
	 * Padding around contained elements, in pixels or CSS length with unit, **or** an object with separate offset values
	 * - If this property is set, its value overrides `padding` from the current style's {@link UIStyle.Definition.ContainerLayout} object.
	 */
	padding?: UIStyle.Offsets = undefined;

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
		UIComponentEvent<
			TContainer,
			{ output: Array<RenderContext.Output | undefined> },
			"ContentRendering"
		>;
}
