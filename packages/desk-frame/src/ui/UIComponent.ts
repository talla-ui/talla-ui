import { app, RenderContext, View } from "../app/index.js";
import { Binding, ManagedEvent } from "../core/index.js";
import { err, ERROR, invalidArgErr } from "../errors.js";
import { UIStyle } from "./UIStyle.js";

/** Empty style instance, used on plain UIComponent instances */
const _emptyStyle = new UIStyle();

/** Type definition for an event that's emitted on UI components */
export type UIComponentEvent<
	TSource extends UIComponent = UIComponent,
	TData extends unknown = unknown,
	TName extends string = string,
> = ManagedEvent<TSource, TData, TName>;

/**
 * Base class for built-in UI components
 *
 * @description
 * This class provides common infrastructure for UI components such as {@link UIButton} and {@link UIColumn}. The UIComponent class is an abstract class and can't be instantiated or rendered on its own.
 *
 * UI components can be constructed directly using `new`, but are often created as part of a 'preset' view hierarchy that's defined using the static {@link UIComponent.with with()} method on view classes, e.g. `UIButton.with({ ... })` or `UIColumn.with({ ... }, ...)`.
 *
 * @online_docs Refer to the Desk website for more documentation on using UI components.
 *
 * @see {@link UIComponent.with()}
 * @hideconstructor
 */
export abstract class UIComponent extends View {
	/**
	 * Creates a preset view class for a UI component
	 *
	 * @summary This static method returns a new constructor, that applies the provided property values, bindings, and event handlers to all instances of the resulting view class.
	 *
	 * Note that this method should be called on UIComponent subclasses rather than UIComponent itself, and is further overridden by {@link UIContainer} to also accept a list of constructors for contained content, see {@link UIContainer.with()}.
	 *
	 * For convenience, several subclasses define shortcut `with...` methods for frequently used preset properties. For example, the {@link UILabel} class includes a static {@link UILabel.withText()} method, which takes a string argument instead of an object.
	 *
	 * @online_docs Refer to the Desk website for more documentation on properties and events that can be preset using the `with` method for every UI component.
	 *
	 * @param preset Property values, bindings, and event handlers, specific to the type of component.
	 * @returns A class that can be used to create instances of this control class with the provided property values, bindings, and event handlers.
	 */
	static with<TViewClass, TComponent extends UIComponent>(
		this: TViewClass & (new (...args: any[]) => TComponent),
		preset: UIComponent.ViewPreset<TComponent>,
	): TViewClass {
		return class PresetUIComponent extends (this as any) {
			constructor(...args: any[]) {
				super(...args);
				this.applyViewPreset({ ...preset });
			}
		} as any;
	}

	/** Creates a new instance of this UI component class */
	constructor() {
		super();

		// set style property accessor (observable)
		this._style = _emptyStyle;
		Object.defineProperty(this, "style", {
			configurable: true,
			get(this: UIComponent) {
				return this._style;
			},
			set(this: UIComponent, v) {
				if (v !== this._style) this.applyStyle(v || _emptyStyle);
			},
		});
	}

	/**
	 * Applies the provided preset properties to this object
	 * - This method is called automatically. Don't call this method after constructing a UI component.
	 */
	override applyViewPreset(preset: {
		/** Style instance or theme style name starting with `@` */
		style?: UIStyle | `@${string}` | Binding<UIStyle>;
		/** True if this component should be hidden from view (doesn't stop the component from being rendered) */
		hidden?: boolean | Binding<boolean>;
		/** Options for the dimensions of this component (overrides) */
		dimensions?: UIStyle.Definition.Dimensions;
		/** Options for the positioning of this component within parent component(s) (overrides) */
		position?: UIStyle.Definition.Position;
		/** WAI-ARIA role for this component, if applicable */
		accessibleRole?: string | Binding<string>;
		/** WAI-ARIA label text for this component (not tooltip), if applicable */
		accessibleLabel?: string | Binding<string>;
		/** True if this component should be focused immediately after rendering for the first time */
		requestFocus?: boolean;
		/** Event that's emitted before rendering the component the first time */
		onBeforeRender?: string;
		/** Event that's emitted by the renderer after rendering the component */
		onRendered?: string;
		/** Event that's emitted when the component gained input focus */
		onFocusIn?: string;
		/** Event that's emitted when the component lost input focus */
		onFocusOut?: string;
		/** Event that's emitted when the component has been clicked or otherwise activated */
		onClick?: string;
		/** Event that's emitted when the component has been double-clicked */
		onDoubleClick?: string;
		/** Event that's emitted when a context menu has been requested on the output element */
		onContextMenu?: string;
		/** Event that's emitted when a mouse button has been released */
		onMouseUp?: string;
		/** Event that's emitted when a mouse button has been pressed down */
		onMouseDown?: string;
		/** Event that's emitted when a key button has been released */
		onKeyUp?: string;
		/** Event that's emitted when a key button has been pressed down */
		onKeyDown?: string;
		/** Event that's emitted when a key button has been pressed */
		onKeyPress?: string;
		/** Event that's emitted when the Enter key button has been pressed */
		onEnterKeyPress?: string;
		/** Event that's emitted when the space bar button has been pressed */
		onSpacebarPress?: string;
		/** Event that's emitted when the Backspace key has been pressed */
		onBackspaceKeyPress?: string;
		/** Event that's emitted when the Delete key has been pressed */
		onDeleteKeyPress?: string;
		/** Event that's emitted when the Escape key has been pressed */
		onEscapeKeyPress?: string;
		/** Event that's emitted when the left arrow key has been pressed */
		onArrowLeftKeyPress?: string;
		/** Event that's emitted when the right arrow key has been pressed */
		onArrowRightKeyPress?: string;
		/** Event that's emitted when the up arrow key has been pressed */
		onArrowUpKeyPress?: string;
		/** Event that's emitted when the down arrow key has been pressed */
		onArrowDownKeyPress?: string;
	}) {
		// make sure style is set first, before overrides
		if (typeof preset.style === "string") {
			preset.style = new UIStyle(preset.style);
		}
		let position = preset.position;
		delete preset.position;
		let dimensions = preset.dimensions;
		delete preset.dimensions;

		// request focus (renderer will remember)
		if (preset.requestFocus) {
			setTimeout(() => this.requestFocus(), 1);
			delete preset.requestFocus;
		}

		// apply all other property values, bindings, and event handlers
		super.applyViewPreset(preset);

		if (this._style === _emptyStyle) this.applyStyle(_emptyStyle);
		if (position) this.position = { ...this.position, ...position };
		if (dimensions) this.dimensions = { ...this.dimensions, ...dimensions };
	}

	/**
	 * Style definitions applied to this component, as a {@link UIStyle} object
	 * - This property is set by the UI component constructor, for example {@link UILabel} sets its style property to `UIStyle.Label`.
	 * - When set again, the definitions from the new {@link UIStyle} object replace all existing styles, setting properties such as {@link UIComponent.dimensions}, {@link UIComponent.position}, and {@link UIControl.decoration}.
	 * - Hence, the final style of a component depends on the order in which the {@link UIComponent.style style} and other properties are set. For preset component classes (i.e. using {@link UIComponent.with with()}), the {@link UIComponent.style style} property is always set first, before any overriding style definition objects on the same preset object; refer to the example below.
	 *
	 * @example
	 * // Preset dimensions are applied after style
	 * const MyLabel = UILabel.with({
	 *   text: "I'm tall and red",
	 *   dimensions: { height: 300 }, // applied
	 *   style: UIStyle.Label.extend({
	 *     textStyle: { color: UIColor.Red }, // applied
	 *     dimensions: { height: 32 } // overridden
	 *   })
	 * });
	 * let label = new MyLabel();
	 * label.dimensions.height // => 300
	 * label.textStyle.color // => UIColor.Red
	 *
	 * @example
	 * // Setting `style` overwrites all existing definitions
	 * label.dimensions = { ...label.dimensions, height: 200 };
	 * label.dimensions.height // => 200
	 *
	 * label.style = UIStyle.Label.extend({
	 *   textStyle: { color: UIColor.Red },
	 *   dimensions: { height: 32 }
	 * });
	 * label.dimensions.height // => 32
	 */
	declare style: UIStyle;

	/**
	 * True if the component should be hidden from view
	 * - UI components may still be rendered even if they're hidden. However, container component isn't rendered while containers themselves are hidden.
	 * - Alternatively, use {@link UIConditional} to show and hide content dynamically.
	 * @see UIConditional
	 */
	hidden?: boolean;

	/**
	 * Style definitions related to the dimensions of this component
	 * - This object is taken from {@link UIComponent.style} when set, but can be assigned directly to override definitions from {@link UIStyle}.
	 * - Refer to {@link UIStyle.Definition.Dimensions} for a list of properties on this object.
	 */
	dimensions!: Readonly<UIStyle.Definition.Dimensions>;

	/**
	 * Style definitions related to the positioning of this component within parent component(s)
	 * - This object is taken from {@link UIComponent.style} when set, but can be assigned directly to override definitions from {@link UIStyle}.
	 * - Refer to {@link UIStyle.Definition.Position} for a list of properties on this object.
	 */
	position!: Readonly<UIStyle.Definition.Position>;

	/** WAI-ARIA role for this component, if applicable */
	accessibleRole?: string;

	/** WAI-ARIA label text for this component (not tooltip), if applicable */
	accessibleLabel?: string;

	/**
	 * Requests input focus on this component
	 * - This method emits an event, which is handled by the renderer if and when possible.
	 */
	requestFocus() {
		this.emit(new RenderContext.RendererEvent("RequestFocus", this));
		return this;
	}

	/**
	 * Requests input focus for the next sibling component
	 * - This method emits an event, which is handled by the renderer if and when possible.
	 */
	requestFocusNext() {
		this.emit(new RenderContext.RendererEvent("RequestFocusNext", this));
		return this;
	}

	/**
	 * Requests input focus for the previous sibling component
	 * - This method emits an event, which is handled by the renderer if and when possible.
	 */
	requestFocusPrevious() {
		this.emit(new RenderContext.RendererEvent("RequestFocusPrevious", this));
		return this;
	}

	/**
	 * Applies all style definitions from the provided {@link UIStyle} object
	 * - Do not use this method directly, simply assign to {@link UIComponent.style} if needed, or use one of the individual override properties instead.
	 * - This method is overridden by subclasses to copy applicable styles to individual properties, such as `dimensions`, `layout`, and `decoration`.
	 */
	protected applyStyle(style: UIStyle) {
		if (!(style instanceof UIStyle)) {
			throw invalidArgErr("style"); // Invalid style
		}
		this._style = style;
		this.dimensions = style.getStyles().dimensions;
		this.position = style.getStyles().position;
	}

	/**
	 * Triggers asynchronous rendering for this component, and all contained components, if any
	 * - This method is invoked automatically, and should not be called by application code. However, it may be overridden to implement a UI component with custom platform-specific rendering code.
	 * @param callback A render callback, usually provided by a container or the application {@link RenderContext} instance
	 */
	render(callback: RenderContext.RenderCallback) {
		if (!this._renderer) {
			let renderer = (this._renderer =
				app.renderer && app.renderer.createObserver(this));
			if (!renderer) throw err(ERROR.UIComponent_NoRenderer);
			renderer.observe(this);
			this.emit(new RenderContext.RendererEvent("BeforeRender", this));
		}
		let event = new RenderContext.RendererEvent("Render", this);
		event.render = callback;
		this.emit(event);
		return this;
	}

	/** Last rendered output, if any; set by the UI component renderer */
	lastRenderOutput?: RenderContext.Output;

	private _style: UIStyle;
	private _renderer?: any;
}

export namespace UIComponent {
	/**
	 * Type definition for the object that can be used to preset a UIComponent view constructor
	 * @summary This type is used to put together the object type for e.g. `.with()` on a UIComponent subclass, based on the provided type parameters.
	 * - TBase is used to infer the type of the parameter accepted by {@link View.applyViewPreset()} on a subclass.
	 * - TView is used to infer the type of a property.
	 * - K is a string type containing all properties to take from TView.
	 */
	export type ViewPreset<
		TBase extends View,
		TView = any,
		K extends keyof TView = never,
	> = TBase extends {
		applyViewPreset(preset: infer P): void;
	}
		? P & { [P in K]?: TView[P] | Binding<TView[P]> }
		: never;
}
