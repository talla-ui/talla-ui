import type { StringConvertible } from "@talla-ui/util";
import { app, RenderContext, View } from "../app/index.js";
import { err, ERROR } from "../errors.js";
import { BindingOrValue, ObservedEvent } from "../object/index.js";
import type { UIColor } from "./style/index.js";

/** Empty array, used for findViewContent */
const _viewContent: any[] = Object.freeze([]) as any;

/** @internal Helper function to emit a non-propagated event; returns true */
function emitRendered(source: View, name: string) {
	source.emit(
		new ObservedEvent(name, source, undefined, undefined, undefined, true),
	);
	return true;
}

/**
 * Base class for built-in UI elements that can be rendered to the screen
 *
 * This class provides common infrastructure for renderable UI elements such as {@link UIButton} and {@link UIColumn}. The UIRenderable class is an abstract class and can't be instantiated or rendered on its own.
 *
 * @online_docs Refer to the online documentation for more documentation on using UI elements.
 * @docgen {hideconstructor}
 */
export abstract class UIRenderable extends View {
	/**
	 * Creates a new {@link ViewBuilder} instance for the current view class
	 * @see {@link View.getViewBuilder}
	 * @docgen {hide}
	 */
	static override getViewBuilder(
		this: new () => UIRenderable,
		preset: {
			/** An identifier for this component */
			name?: string;
			/** True if this component should be hidden from view (doesn't stop the component from being rendered) */
			hidden?: BindingOrValue<boolean>;
			/** Options for the positioning of this component within parent component(s) (overrides) */
			position?: BindingOrValue<UIRenderable.Position>;
			/** True if this component should grow to fill available space */
			grow?: BindingOrValue<boolean>;
			/** WAI-ARIA role for this component, if applicable */
			accessibleRole?: BindingOrValue<StringConvertible>;
			/** WAI-ARIA label text for this component (not tooltip), if applicable */
			accessibleLabel?: BindingOrValue<StringConvertible>;
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
			/** Event that's emitted when a mouse button or touch input has been pressed */
			onPress?: string;
			/** Event that's emitted when a mouse button or touch input has been released */
			onRelease?: string;
			/** Event that's emitted when a key button has been released */
			onKeyUp?: string;
			/** Event that's emitted when a key button has been pressed down */
			onKeyDown?: string;
			/** Event that's emitted when a key button has been pressed */
			onKeyPress?: string;
			/** Event that's emitted when the space bar has been pressed */
			onSpacebarPress?: string;
			/** Event that's emitted when the Enter key has been pressed */
			onEnterKeyPress?: string;
			/** Event that's emitted when the Tab key has been pressed */
			onTabKeyPress?: string;
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
		},
	) {
		let requestFocus = preset.requestFocus;
		delete preset.requestFocus;
		let b = super.getViewBuilder(preset);
		if (requestFocus) {
			b.addInitializer((component) => {
				setTimeout(() => component.requestFocus(), 1);
			});
		}
		return b;
	}

	/**
	 * An identifier for this component
	 * - Identifiers don't have to be unique, but can be used to identify components in a part of the view hierarchy.
	 * - Depending on the platform, this identifier may be exposed in the rendered output (e.g. HTML attribute), but only once.
	 */
	name?: string;

	/**
	 * True if the component should be hidden from view
	 * - UI elements may still be rendered even if they're hidden. However, container component isn't rendered while containers themselves are hidden.
	 * - Alternatively, use {@link UIShowView} to show and hide content dynamically.
	 * @see UIShowView
	 */
	hidden = false;

	/**
	 * Options related to the position of this component
	 * - If set, these options replace the defaults for the type of component.
	 */
	position?: Readonly<UIRenderable.Position> = undefined;

	/**
	 * True if this component should grow to fill available space
	 * - If set, this property overrides {@link UIRenderable.Dimensions grow} of the component's `style` object, if any.
	 * - As an exception, cells grow by default, even if this property is set to undefined. Set this property to `false` to contain cells to their content size instead.
	 */
	grow?: boolean = undefined;

	/** WAI-ARIA role for this component, if applicable */
	accessibleRole?: StringConvertible;

	/** WAI-ARIA label text for this component (not tooltip), if applicable */
	accessibleLabel?: StringConvertible;

	/**
	 * Requests input focus on this component
	 * - This method emits an event, which is handled by the renderer if and when possible.
	 */
	requestFocus() {
		return emitRendered(this, "RequestFocus");
	}

	/**
	 * Requests input focus for the next sibling component
	 * - This method emits an event, which is handled by the renderer if and when possible.
	 */
	requestFocusNext() {
		return emitRendered(this, "RequestFocusNext");
	}

	/**
	 * Requests input focus for the previous sibling component
	 * - This method emits an event, which is handled by the renderer if and when possible.
	 */
	requestFocusPrevious() {
		return emitRendered(this, "RequestFocusPrevious");
	}

	/**
	 * Triggers asynchronous rendering for this component, and all contained components, if any
	 * - This method is invoked automatically, and should not be called by application code. However, it may be overridden to implement a UI element with custom platform-specific rendering code.
	 * @param callback A render callback, usually provided by a container or the application {@link RenderContext} instance
	 */
	render(callback: RenderContext.RenderCallback) {
		if (!this._renderer) {
			let renderer = app.renderer?.createObserver(this);
			if (!renderer) throw err(ERROR.UIRenderable_NoRenderer);
			this._renderer = renderer;
			emitRendered(this, "BeforeRender");
		}

		// create Render event with provided callback
		// (to be handled by platform renderer)
		let event = new ObservedEvent(
			"Render",
			this,
			{ render: callback },
			undefined,
			undefined,
			true,
		);
		this.emit(event);
		return this;
	}

	/** Implementation of {@link View.findViewContent()}, returns an empty array unless overridden */
	override findViewContent<T extends View>(
		type: new (...args: any[]) => T,
	): T[] {
		return _viewContent;
	}

	/** Last rendered output, if any; set by the UI element renderer */
	lastRenderOutput?: RenderContext.Output;

	private _renderer?: any;
}

export namespace UIRenderable {
	/**
	 * Options for component positioning within their parent component(s)
	 * @see {@link UIRenderable.position}
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
			| "auto"
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
	 * @see {@link UIStyle}
	 */
	export type Dimensions = {
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
		/** Growth quotient (0 or false for no growth, higher values for faster growth when needed; true = 1) */
		grow?: number | boolean;
		/** Shrink quotient (0 or false to never shrink, higher values for faster shrinking when needed; true = 1) */
		shrink?: number | boolean;
	};

	/**
	 * Options for the appearance of UI elements
	 * - The `css` property can be used to include miscellaneous CSS attributes, at your own risk.
	 * @see {@link UIStyle}
	 */
	export type Decoration = {
		/** Background style or color */
		background?: UIColor;
		/** Text color */
		textColor?: UIColor;
		/** Border color */
		borderColor?:
			| UIColor
			| {
					top?: UIColor;
					bottom?: UIColor;
					left?: UIColor;
					right?: UIColor;
					start?: UIColor;
					end?: UIColor;
			  };
		/** Border style (CSS), defaults to "solid" */
		borderStyle?: string;
		/** Border thickness (in pixels or CSS string, or separate offset values) */
		borderThickness?: Offsets;
		/** Border radius (in pixels or CSS string) */
		borderRadius?:
			| string
			| number
			| {
					topLeft?: string | number;
					topRight?: string | number;
					bottomLeft?: string | number;
					bottomRight?: string | number;
					topStart?: string | number;
					bottomStart?: string | number;
					topEnd?: string | number;
					bottomEnd?: string | number;
			  };
		/** Padding within control element (in pixels or CSS string, or separate offset values) */
		padding?: Offsets;
		/** Opacity (0-1) */
		opacity?: number;
		/** Cursor style (same values as CSS, if supported) */
		cursor?: string;
		/** Miscellaneous CSS attributes */
		css?: Partial<CSSStyleDeclaration>;
	};

	/**
	 * Options for typography used on UI elements
	 * @see {@link UIStyle}
	 */
	export type TextStyle = {
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
		/** True for monospaced (tabular) numeric characters */
		tabularNums?: boolean;
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
		/** True if text can be selected by the user */
		userSelect?: boolean;
	};
}
