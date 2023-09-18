import { app, RenderContext, View, ViewClass } from "../app/index.js";
import { Binding, StringConvertible } from "../core/index.js";
import { err, ERROR } from "../errors.js";
import type { UIColor } from "./UIColor.js";

/** Empty array, used for findViewContent */
const _viewContent: any[] = Object.freeze([]) as any;

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

	/**
	 * Applies the provided preset properties to this object
	 * - This method is called automatically. Don't call this method after constructing a UI component.
	 */
	override applyViewPreset(preset: {
		/** True if this component should be hidden from view (doesn't stop the component from being rendered) */
		hidden?: boolean | Binding<boolean>;
		/** Options for the positioning of this component within parent component(s) (overrides) */
		position?: UIComponent.Position | Binding<UIComponent.Position>;
		/** WAI-ARIA role for this component, if applicable */
		accessibleRole?: StringConvertible | Binding<StringConvertible>;
		/** WAI-ARIA label text for this component (not tooltip), if applicable */
		accessibleLabel?: StringConvertible | Binding<StringConvertible>;
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
		// request focus (renderer will remember)
		if (preset.requestFocus) {
			setTimeout(() => this.requestFocus(), 1);
			delete preset.requestFocus;
		}

		// apply all other property values, bindings, and event handlers
		super.applyViewPreset(preset);
	}

	/**
	 * True if the component should be hidden from view
	 * - UI components may still be rendered even if they're hidden. However, container component isn't rendered while containers themselves are hidden.
	 * - Alternatively, use {@link UIConditional} to show and hide content dynamically.
	 * @see UIConditional
	 */
	hidden = false;

	/**
	 * Options related to the position of this component
	 * - If set, these options replace the defaults for the type of component.
	 */
	position?: Readonly<UIComponent.Position> = undefined;

	/** WAI-ARIA role for this component, if applicable */
	accessibleRole?: StringConvertible;

	/** WAI-ARIA label text for this component (not tooltip), if applicable */
	accessibleLabel?: StringConvertible;

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

	/** Implementation of {@link View.findViewContent()}, returns an empty array unless overridden */
	override findViewContent<T extends View>(type: ViewClass<T>): T[] {
		return _viewContent;
	}

	/** Last rendered output, if any; set by the UI component renderer */
	lastRenderOutput?: RenderContext.Output;

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

	/**
	 * Options for component positioning within their parent component(s)
	 * @see {@link UIComponent.position}
	 */
	export type Position = {
		/** Position of the component in the direction perpendicular to the distribution axis of the parent component, or `overlay` if the component should be placed on top of other components (i.e. CSS absolute positioning) */
		gravity?:
			| "start"
			| "end"
			| "center"
			| "stretch"
			| "baseline"
			| "overlay"
			| "cover"
			| "";
		/** Top anchor: relative distance, or absolute position if `gravity` is 'overlay' (in pixels or string with unit, defaults to `auto`) */
		top?: string | number;
		/** Bottom anchor: relative distance, or absolute position if `gravity` is 'overlay' (in pixels or string with unit, defaults to `auto`) */
		bottom?: string | number;
		/** Left anchor: relative distance, or absolute position if `gravity` is 'overlay' (in pixels or string with unit, defaults to `auto`), same as `start` for LTR text direction */
		left?: string | number;
		/** Right anchor: relative distance, or absolute position if `gravity` is 'overlay' (in pixels or string with unit, defaults to `auto`), same as `end` for LTR text direction */
		right?: string | number;
		/** Start anchor: relative distance, or absolute position if `gravity` is 'overlay' (in pixels or string with unit, defaults to `auto`), same as `left` for LTR text direction */
		start?: string | number;
		/** End anchor: relative distance, or absolute position if `gravity` is 'overlay' (in pixels or string with unit, defaults to `auto`), same as `right` for LTR text direction */
		end?: string | number;
	};

	/** Type definition for a measurement applied to padding, margin, or border thickness */
	export type Offsets =
		| string
		| number
		| {
				x?: string | number;
				y?: string | number;
				top?: string | number;
				bottom?: string | number;
				left?: string | number;
				right?: string | number;
				start?: string | number;
				end?: string | number;
		  };

	/**
	 * Options for component dimensions
	 * @see {@link UICellStyle}
	 * @see {@link UIButtonStyle}
	 * @see {@link UIImageStyle}
	 * @see {@link UILabelStyle}
	 * @see {@link UITextFieldStyle}
	 * @see {@link UIToggleStyle}
	 */
	export type DimensionsStyleType = {
		/** Outer width of the element, as specified (in pixels or string with unit) */
		width?: string | number;
		/** Outer height of the element, as specified (in pixels or string with unit) */
		height?: string | number;
		/** Minimum width of the element, as specified (in pixels or string with unit) */
		minWidth?: string | number;
		/** Maximum width of the element, as specified (in pixels or string with unit) */
		maxWidth?: string | number;
		/** Minimum height of the element, as specified (in pixels or string with unit) */
		minHeight?: string | number;
		/** Maximum height of the element, as specified (in pixels or string with unit) */
		maxHeight?: string | number;
		/** Growth quotient (0 for no growth, higher values for faster growth when needed) */
		grow?: number;
		/** Shrink quotient (0 to never shrink, higher values for faster shrinking when needed) */
		shrink?: number;
	};

	/**
	 * Options for the appearance of UI components
	 * - The `css` property can be used to include miscellaneous CSS attributes, at your own risk.
	 * @see {@link UICellStyle}
	 * @see {@link UIButtonStyle}
	 * @see {@link UIImageStyle}
	 * @see {@link UILabelStyle}
	 * @see {@link UITextFieldStyle}
	 * @see {@link UIToggleLabelStyle}
	 */
	export type DecorationStyleType = {
		/** Background style or color (`UIColor` or string) */
		background?: UIColor | string;
		/** Text color (`UIColor` or string) */
		textColor?: UIColor | string;
		/** Border color (`UIColor` or string) */
		borderColor?: UIColor | string;
		/** Border style (CSS), defaults to "solid" */
		borderStyle?: string;
		/** Border thickness (in pixels or CSS string, or separate offset values) */
		borderThickness?: Offsets;
		/** Border radius (in pixels or CSS string) */
		borderRadius?: string | number;
		/** Padding within control element (in pixels or CSS string, or separate offset values) */
		padding?: Offsets;
		/** Drop shadow elevation level (0–1) */
		dropShadow?: number;
		/** Opacity (0-1) */
		opacity?: number;
		/** Miscellaneous CSS attributes */
		css?: Partial<CSSStyleDeclaration>;
	};

	/**
	 * Options for typography used on UI components
	 * @see {@link UIButtonStyle}
	 * @see {@link UILabelStyle}
	 * @see {@link UITextFieldStyle}
	 * @see {@link UIToggleLabelStyle}
	 */
	export type TextStyleType = {
		/** Text direction (rtl or ltr) */
		direction?: "rtl" | "ltr";
		/** Text alignment (CSS) */
		textAlign?: string;
		/** Font family (CSS) */
		fontFamily?: string;
		/** Font size (pixels or string with unit) */
		fontSize?: string | number;
		/** Font weight (CSS) */
		fontWeight?: string | number;
		/** Letter spacing (pixels or string with unit) */
		letterSpacing?: string | number;
		/** Line height (CSS relative to font size, *not* in pixels) */
		lineHeight?: string | number;
		/** Line break handling mode (CSS white-space) */
		lineBreakMode?:
			| "normal"
			| "nowrap"
			| "pre"
			| "pre-wrap"
			| "pre-line"
			| "ellipsis"
			| "clip"
			| "";
		/** True for bold text (overrides `fontWeight` value) */
		bold?: boolean;
		/** True for italic text */
		italic?: boolean;
		/** True for all-uppercase text */
		uppercase?: boolean;
		/** True for text using small caps */
		smallCaps?: boolean;
		/** True for underlined text */
		underline?: boolean;
		/** True for struck trough text */
		strikeThrough?: boolean;
	};
}
