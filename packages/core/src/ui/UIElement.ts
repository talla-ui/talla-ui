import type { StringConvertible } from "@talla-ui/util";
import {
	AppContext,
	RenderContext,
	View,
	ViewBuilder,
	ViewBuilderEventHandler,
	ViewBuilderFunction,
} from "../app/index.js";
import { err, ERROR } from "../errors.js";
import {
	BindingOrValue,
	isBinding,
	ObservableEvent,
	ObservableObject,
} from "../object/index.js";
import { StyleOverrides, UIColor } from "./style/index.js";

/** @internal Empty array, used for findViewContent. */
const _emptyViewContent: any[] = Object.freeze([]) as any;

/** @internal Helper function to emit a non-propagated event; returns true. */
function emitRendered(source: View, name: string) {
	source.emit(new ObservableEvent(name, source, undefined, undefined, true));
	return true;
}

/**
 * The base class for built-in UI view elements.
 * - This class is abstract and cannot be instantiated directly.
 * - Subclasses include controls such as {@link UIButton} and containers such as {@link UIColumn}.
 *
 * The UIElement class provides common infrastructure for UI controls and containers,
 * including properties for styling, positioning, and accessibility.
 *
 * @online_docs Refer to the online documentation for more information on using UI elements.
 * @docgen {hideconstructor}
 */
export abstract class UIElement extends View {
	static {
		// Disable bindings on UIElement itself
		UIElement.disableBindings();
	}

	/**
	 * The identifier for this UI element.
	 * - Identifiers do not have to be unique, but can be used to identify elements in a part of the view hierarchy.
	 * - Depending on the platform, this identifier may be exposed in the rendered output (e.g. HTML attribute).
	 */
	name?: string;

	/**
	 * True if the element should be hidden from view.
	 * - UI elements may still be rendered even if they are hidden; however, container content is not rendered while containers themselves are hidden.
	 * - Alternatively, use {@link UIShowView} to show and hide content dynamically.
	 */
	hidden = false;

	/**
	 * The name of the style to apply to this element.
	 * - This should be a style name defined by the platform handler (e.g. "default", "accent").
	 */
	styleName?: string = undefined;

	/**
	 * The style overrides to apply to this element on top of the named style.
	 * - These overrides are applied directly as inline styles.
	 */
	style?: StyleOverrides = undefined;

	/**
	 * Applies additional style overrides to this element.
	 * - Creates a new style object that combines existing overrides with the provided ones.
	 * @param styleOverrides The style overrides to apply.
	 */
	setStyle(styleOverrides: StyleOverrides) {
		this.style = { ...this.style, ...styleOverrides };
	}

	/**
	 * The position options for this element.
	 * - If set, these options replace the defaults for the type of element.
	 */
	position?: Readonly<UIElement.Position> = undefined;

	/** The WAI-ARIA role for this element, if applicable. */
	accessibleRole?: StringConvertible;

	/** The WAI-ARIA label text for this element, if applicable. */
	accessibleLabel?: StringConvertible;

	/**
	 * Requests input focus on this element.
	 * - This method emits an event, which is handled by the renderer if and when possible.
	 */
	requestFocus() {
		emitRendered(this, "RequestFocus");
	}

	/**
	 * Requests input focus for the next sibling element.
	 * - This method emits an event, which is handled by the renderer if and when possible.
	 */
	requestFocusNext() {
		emitRendered(this, "RequestFocusNext");
	}

	/**
	 * Requests input focus for the previous sibling element.
	 * - This method emits an event, which is handled by the renderer if and when possible.
	 */
	requestFocusPrevious() {
		emitRendered(this, "RequestFocusPrevious");
	}

	/**
	 * Returns the renderer observer for this element, if any.
	 * - Returns undefined if the element has not been rendered yet.
	 */
	protected getRenderer(): RenderContext.UIElementRenderer | undefined {
		return this._renderer;
	}

	/** Returns true if this element currently has input focus. */
	isFocused(): boolean {
		return !!this.getRenderer()?.isFocused?.();
	}

	/**
	 * Triggers asynchronous rendering for this element and all contained elements, if any.
	 * - This method is invoked automatically and should not be called by application code.
	 * - Override this method to implement a UI element with custom platform-specific rendering code.
	 * @param callback A render callback, usually provided by a container or the application {@link RenderContext} instance.
	 */
	render(callback: RenderContext.RenderCallback) {
		if (!this._renderer) {
			let renderer = AppContext.getInstance().renderer?.createObserver(this);
			if (!renderer) throw err(ERROR.UIViewElement_NoRenderer);
			this._renderer = renderer;
			emitRendered(this, "BeforeRender");
		}

		// create Render event with provided callback
		// (to be handled by platform renderer)
		let event = new ObservableEvent(
			"Render",
			this,
			{ render: callback },
			undefined,
			true,
		);
		this.emit(event);
	}

	/** Implementation of {@link View.findViewContent()}; returns an empty array unless overridden. */
	override findViewContent<T extends View>(
		type: new (...args: any[]) => T,
	): T[] {
		return _emptyViewContent;
	}

	/** The last rendered output, if any; set by the UI element renderer. */
	lastRenderOutput?: RenderContext.Output;

	private _renderer?: any;
}

export namespace UIElement {
	/**
	 * A type that describes options for positioning within parent elements.
	 * @see {@link UIElement.position}
	 */
	export type Position = {
		/** The position of the element in the direction perpendicular to the distribution axis of the parent element, or `overlay` if the element should be placed on top of other elements (i.e. CSS absolute positioning). */
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
		/** The top anchor: relative distance, or absolute position if `gravity` is "overlay" (in pixels or string with unit; defaults to `auto`). */
		top?: string | number;
		/** The bottom anchor: relative distance, or absolute position if `gravity` is "overlay" (in pixels or string with unit; defaults to `auto`). */
		bottom?: string | number;
		/** The left anchor: relative distance, or absolute position if `gravity` is "overlay" (in pixels or string with unit; defaults to `auto`); same as `start` for LTR text direction. */
		left?: string | number;
		/** The right anchor: relative distance, or absolute position if `gravity` is "overlay" (in pixels or string with unit; defaults to `auto`); same as `end` for LTR text direction. */
		right?: string | number;
		/** The start anchor: relative distance, or absolute position if `gravity` is "overlay" (in pixels or string with unit; defaults to `auto`); same as `left` for LTR text direction. */
		start?: string | number;
		/** The end anchor: relative distance, or absolute position if `gravity` is "overlay" (in pixels or string with unit; defaults to `auto`); same as `right` for LTR text direction. */
		end?: string | number;
	};

	/**
	 * An abstract base class for UI element builders.
	 * - Provides a fluent interface for creating and configuring {@link UIElement} instances.
	 * - Methods on this class set properties, styles, and behaviors on an initializer.
	 *
	 * This class provides a fluent interface for creating and configuring UI elements,
	 * including all built-in containers and controls. Objects of this type are returned by
	 * functions such as {@link UI.Button}, {@link UI.Text}, and {@link UI.Column}, with
	 * additional methods as included in their specific return type (e.g. {@link UIButton.ButtonBuilder}).
	 */
	export abstract class ElementBuilder<
		TView extends UIElement,
		TStyleName extends string = string,
	> implements ViewBuilder<TView>
	{
		/** The initializer instance that handles the actual view configuration. */
		abstract readonly initializer: ViewBuilder.Initializer<TView>;

		/**
		 * Creates a new instance of the UI element.
		 * @returns A newly created and initialized UI element instance.
		 */
		build(): TView {
			return this.initializer.build();
		}

		/**
		 * Applies a view builder function, returning its result.
		 * - The modifier may call additional methods on the builder, use its initializer directly, or return a new builder that encapsulates the current one.
		 * @param modifier A function that takes the current builder instance and applies configurations.
		 * @returns The result of the function.
		 *
		 * @example
		 * function limitCellWidth(b: UICell.CellBuilder) {
		 *   return b.width(200, 100).shrink();
		 * }
		 * let myCell = UI.Cell("Hello").apply(limitCellWidth);
		 */
		apply<TResult extends ViewBuilder = this>(
			modifier?: ViewBuilderFunction<TResult, this>,
		): TResult {
			return modifier ? modifier(this) : (this as any);
		}

		// --- base properties

		/**
		 * Sets the element name, which can be used to identify the element in the view hierarchy.
		 * @param value The element name, or a binding to a string value.
		 * @returns The builder instance for chaining.
		 */
		name(value?: BindingOrValue<string | undefined>) {
			return this.setProperty("name", value);
		}

		/**
		 * Sets the WAI-ARIA role for accessibility.
		 * @param value The role name (e.g. "button", "navigation").
		 * @returns The builder instance for chaining.
		 * @see {@link UIElement.accessibleRole}
		 */
		accessibleRole(value?: BindingOrValue<string | undefined>) {
			return this.setProperty("accessibleRole", value);
		}

		/**
		 * Sets the WAI-ARIA label for accessibility.
		 * @param value The accessible label text.
		 * @returns The builder instance for chaining.
		 * @see {@link UIElement.accessibleLabel}
		 */
		accessibleLabel(value?: BindingOrValue<string | undefined>) {
			return this.setProperty("accessibleLabel", value);
		}

		/**
		 * Hides the element when a specified condition is true.
		 * - Elements are still rendered even when they are hidden; use {@link UIShowView} to render views conditionally.
		 * @param condition A value or binding; if the value is truthy, the element will be hidden.
		 * @returns The builder instance for chaining.
		 * @see {@link UIElement.hidden}
		 */
		hideWhen(condition: BindingOrValue<any>) {
			this.initializer.update(condition, function (value) {
				this.hidden = !!value;
			});
			return this;
		}

		/**
		 * Sets the position of the element within its parent.
		 *
		 * @summary
		 * Positions the element using a gravity value (e.g. "start", "center", "end") along with
		 * optional offsets, or a complete {@link UIElement.Position} object.
		 *
		 * @param position A {@link UIElement.Position} object, or a gravity string ("start", "center", "end", etc.).
		 * @param top The top offset (used if `position` is a gravity string).
		 * @param end The end offset (used if `position` is a gravity string).
		 * @param bottom The bottom offset (used if `position` is a gravity string).
		 * @param start The start offset (used if `position` is a gravity string).
		 * @returns The builder instance for chaining.
		 * @see {@link UIElement.position}
		 */
		position(
			position?: BindingOrValue<
				UIElement.Position | UIElement.Position["gravity"] | undefined
			>,
			top?: string | number,
			end?: string | number,
			bottom?: string | number,
			start?: string | number,
		) {
			this.initializer.update(position, function (value) {
				if (typeof value === "string") {
					this.position = {
						gravity: value as Position["gravity"],
						top,
						bottom,
						start,
						end,
					};
				} else {
					this.position = value;
				}
			});
			return this;
		}

		// --- style

		/**
		 * Sets both the width and height of the element.
		 * @param width The width value, in pixels or string with unit.
		 * @param height The height value (if different from width), in pixels or string with unit.
		 * @returns The builder instance for chaining.
		 */
		size(
			width?: BindingOrValue<string | number | undefined>,
			height: BindingOrValue<string | number | undefined> = width,
		) {
			if (width != null) this.width(width, width, width);
			if (height != null) this.height(height, height, height);
			return this;
		}

		/**
		 * Sets the outer, minimum, and/or maximum width of the element.
		 * @param width The target width, in pixels or string with unit.
		 * @param minWidth The minimum width, in pixels or string with unit.
		 * @param maxWidth The maximum width, in pixels or string with unit.
		 * @returns The builder instance for chaining.
		 */
		width(
			width?: BindingOrValue<string | number | undefined>,
			minWidth?: BindingOrValue<string | number | undefined>,
			maxWidth?: BindingOrValue<string | number | undefined>,
		) {
			this.setStyleOverride("width", width);
			if (minWidth != null) this.setStyleOverride("minWidth", minWidth);
			if (maxWidth != null) this.setStyleOverride("maxWidth", maxWidth);
			return this;
		}

		/**
		 * Sets the minimum width of the element.
		 * @param minWidth The minimum width, in pixels or string with unit.
		 * @returns The builder instance for chaining.
		 */
		minWidth(minWidth?: BindingOrValue<string | number | undefined>) {
			return this.setStyleOverride("minWidth", minWidth);
		}

		/**
		 * Sets the maximum width of the element.
		 * @param maxWidth The maximum width, in pixels or string with unit.
		 * @returns The builder instance for chaining.
		 */
		maxWidth(maxWidth?: BindingOrValue<string | number | undefined>) {
			return this.setStyleOverride("maxWidth", maxWidth);
		}

		/**
		 * Sets the outer, minimum, and/or maximum height of the element.
		 * @param height The target height, in pixels or string with unit.
		 * @param minHeight The minimum height, in pixels or string with unit.
		 * @param maxHeight The maximum height, in pixels or string with unit.
		 * @returns The builder instance for chaining.
		 */
		height(
			height?: BindingOrValue<string | number | undefined>,
			minHeight?: BindingOrValue<string | number | undefined>,
			maxHeight?: BindingOrValue<string | number | undefined>,
		) {
			this.setStyleOverride("height", height);
			if (minHeight != null) this.setStyleOverride("minHeight", minHeight);
			if (maxHeight != null) this.setStyleOverride("maxHeight", maxHeight);
			return this;
		}

		/**
		 * Sets the minimum height of the element.
		 * @param minHeight The minimum height, in pixels or string with unit.
		 * @returns The builder instance for chaining.
		 */
		minHeight(minHeight?: BindingOrValue<string | number | undefined>) {
			return this.setStyleOverride("minHeight", minHeight);
		}

		/**
		 * Sets the maximum height of the element.
		 * @param maxHeight The maximum height, in pixels or string with unit.
		 * @returns The builder instance for chaining.
		 */
		maxHeight(maxHeight?: BindingOrValue<string | number | undefined>) {
			return this.setStyleOverride("maxHeight", maxHeight);
		}

		/**
		 * Sets the flex-grow factor of the element.
		 * @param grow A number, or `true` for a grow factor of 1; defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		grow(grow: BindingOrValue<number | boolean> = true) {
			return this.setStyleOverride("grow", grow);
		}

		/**
		 * Sets the flex-shrink factor of the element.
		 * @param shrink A number, or `true` for a shrink factor of 1; defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		shrink(shrink: BindingOrValue<number | boolean> = true) {
			return this.setStyleOverride("shrink", shrink);
		}

		/**
		 * Sets the padding around the element.
		 * @param padding An object with offsets (`top`, `bottom`, `x`, etc.), a single number, or "gap" for the current default gap size; defaults to "gap".
		 * @returns The builder instance for chaining.
		 */
		padding(
			padding: BindingOrValue<StyleOverrides.Offsets | undefined> = "gap",
		) {
			return this.setStyleOverride("padding", padding);
		}

		/**
		 * Sets the margin around the element.
		 * @param margin An object with offsets (`top`, `bottom`, `x`, etc.), a single number, or "gap" for the current default gap size; defaults to "gap".
		 * @returns The builder instance for chaining.
		 */
		margin(margin: BindingOrValue<StyleOverrides.Offsets | undefined> = "gap") {
			return this.setStyleOverride("margin", margin);
		}

		/**
		 * Sets the text color.
		 * @param color A {@link UIColor} instance, or a color name (e.g. "text", "accent").
		 * @returns The builder instance for chaining.
		 */
		textColor(color: BindingOrValue<UIColor | UIColor.ColorName | undefined>) {
			return this.setStyleOverride("textColor", color, true);
		}

		/** Alias for {@link textColor}; sets the text color. */
		fg(color?: BindingOrValue<UIColor | UIColor.ColorName | undefined>) {
			return this.textColor(color);
		}

		/**
		 * Sets the background color.
		 * @param color A {@link UIColor} instance, or a color name (e.g. "background", "accent").
		 * @returns The builder instance for chaining.
		 */
		background(color: BindingOrValue<UIColor | UIColor.ColorName | undefined>) {
			return this.setStyleOverride("background", color, true);
		}

		/** Alias for {@link background}; sets the background color. */
		bg(color?: BindingOrValue<UIColor | UIColor.ColorName | undefined>) {
			return this.background(color);
		}

		/**
		 * Sets the border properties of the element.
		 *
		 * @summary
		 * Configures the border with optional width, color, style, and corner radius.
		 * If only width is provided, the color defaults to the divider color.
		 *
		 * @param borderWidth The width of the border (all sides, or separate offsets), in pixels or string with unit; defaults to 1.
		 * @param borderColor The color of the border; defaults to the divider color.
		 * @param borderStyle The style of the border (e.g. "solid", "dashed").
		 * @param borderRadius The radius of the border corners, in pixels or string with unit.
		 * @returns The builder instance for chaining.
		 */
		border(
			borderWidth: BindingOrValue<StyleOverrides.Offsets | undefined> = 1,
			borderColor?: BindingOrValue<UIColor | UIColor.ColorName | undefined>,
			borderStyle?: BindingOrValue<string | undefined>,
			borderRadius?: BindingOrValue<StyleOverrides["borderRadius"] | undefined>,
		) {
			if (borderWidth != null) {
				this.setStyleOverride("borderWidth", borderWidth);
				if (!borderColor) borderColor = UIColor.getColor("divider");
			}
			if (borderColor) this.setStyleOverride("borderColor", borderColor, true);
			if (borderStyle) this.setStyleOverride("borderStyle", borderStyle);
			if (borderRadius != null)
				this.setStyleOverride("borderRadius", borderRadius);
			return this;
		}

		/**
		 * Sets the radius of the border corners.
		 * @param radius A number, or "gap" for the current default gap size; defaults to "gap".
		 * @returns The builder instance for chaining.
		 */
		borderRadius(
			radius: BindingOrValue<
				StyleOverrides["borderRadius"] | undefined
			> = "gap",
		) {
			return this.setStyleOverride("borderRadius", radius);
		}

		/**
		 * Adds a drop shadow effect.
		 * @param dropShadow The drop shadow height in pixels (approximate blur distance); negative values for inset shadows; defaults to 8.
		 * @returns The builder instance for chaining.
		 */
		dropShadow(dropShadow: BindingOrValue<number | undefined> = 8) {
			return this.setStyleOverride("dropShadow", dropShadow);
		}

		/**
		 * Sets the opacity of the element.
		 * @param opacity A value between 0 (transparent) and 1 (opaque).
		 * @returns The builder instance for chaining.
		 */
		opacity(opacity?: BindingOrValue<number | undefined>) {
			return this.setStyleOverride("opacity", opacity);
		}

		/**
		 * Dims the element by reducing its opacity.
		 * @param dim If true, sets opacity to 0.5; if false, sets it to 1; defaults to true.
		 * @returns The builder instance for chaining.
		 */
		dim(dim: BindingOrValue<boolean | undefined> = true) {
			return this.setStyleOverride(
				"opacity",
				isBinding(dim) ? dim.map((value) => (value ? 0.5 : 1)) : dim ? 0.5 : 1,
			);
		}

		/**
		 * Sets the mouse cursor style when hovering over the element.
		 * @param cursor A CSS cursor name (e.g. "pointer", "default"); defaults to "default".
		 * @returns The builder instance for chaining.
		 */
		cursor(cursor: BindingOrValue<string | undefined> = "default") {
			return this.setStyleOverride("cursor", cursor);
		}

		/**
		 * Sets the font family.
		 * @param family The font family name (e.g. "sans-serif").
		 * @returns The builder instance for chaining.
		 */
		fontFamily(family?: BindingOrValue<string | undefined>) {
			return this.setStyleOverride("fontFamily", family);
		}

		/**
		 * Sets the font size.
		 * @param size The font size, in pixels or string with unit.
		 * @returns The builder instance for chaining.
		 */
		fontSize(size?: BindingOrValue<string | number | undefined>) {
			return this.setStyleOverride("fontSize", size);
		}

		/**
		 * Sets the font weight.
		 * @param weight The font weight (e.g. 400, "bold").
		 * @returns The builder instance for chaining.
		 */
		fontWeight(weight?: BindingOrValue<string | number | undefined>) {
			return this.setStyleOverride("fontWeight", weight);
		}

		/**
		 * Makes the text bold.
		 * @param bold If true, applies bold styling; defaults to true.
		 * @returns The builder instance for chaining.
		 */
		bold(bold: BindingOrValue<boolean | undefined> = true) {
			return this.setStyleOverride("bold", bold);
		}

		/**
		 * Makes the text italic.
		 * @param italic If true, applies italic styling; defaults to true.
		 * @returns The builder instance for chaining.
		 */
		italic(italic: BindingOrValue<boolean | undefined> = true) {
			return this.setStyleOverride("italic", italic);
		}

		/**
		 * Adds an underline to the text.
		 * @param underline If true, underlines the text; defaults to true.
		 * @returns The builder instance for chaining.
		 */
		underline(underline: BindingOrValue<boolean | undefined> = true) {
			return this.setStyleOverride("underline", underline);
		}

		/**
		 * Sets the line height.
		 * @param lineHeight The line height, as a multiplier of the font size.
		 * @returns The builder instance for chaining.
		 */
		lineHeight(lineHeight?: BindingOrValue<string | number | undefined>) {
			return this.setStyleOverride("lineHeight", lineHeight);
		}

		/**
		 * Sets the text alignment.
		 * @param align The text alignment (CSS value).
		 * @returns The builder instance for chaining.
		 */
		textAlign(align?: BindingOrValue<StyleOverrides["textAlign"] | undefined>) {
			return this.setStyleOverride("textAlign", align);
		}

		/**
		 * Alias for {@link textAlign}.
		 * - This method is overridden on column and row builders to set alignment of content within the container instead.
		 * @param align The text alignment (CSS value).
		 * @returns The builder instance for chaining.
		 */
		align(align?: BindingOrValue<StyleOverrides["textAlign"] | undefined>) {
			return this.textAlign(align);
		}

		/**
		 * Applies a named style or set of style overrides.
		 * - If a string is provided (or bound), it updates the style name (e.g. "default", "accent").
		 * - If an object is provided (or bound), style overrides are applied directly.
		 * @param value The style name or style overrides object, or a binding.
		 * @returns The builder instance for chaining.
		 */
		style(
			value?: BindingOrValue<
				TStyleName | (string & {}) | StyleOverrides | undefined
			>,
		) {
			if (isBinding(value)) {
				this.initializer.finalize((view) => {
					view.observe(value, function (v) {
						if (typeof v === "string" || v === undefined) {
							view.styleName = v;
						} else if (v) {
							view.setStyle(v);
						}
					});
				});
			} else if (typeof value === "string" || value === undefined) {
				this.setProperty("styleName", value);
			} else if (value) {
				let overrides = this._getStyleOverrides();
				Object.assign(overrides, value);
			}
			return this;
		}

		// --- delayed initialization

		/**
		 * Requests input focus for this element after it has been rendered.
		 */
		requestFocus() {
			this.initializer.finalize((view) => {
				setTimeout(() => view.requestFocus(), 1);
			});
			return this;
		}

		/**
		 * Adds an event handler to all instances of the UI element.
		 * - Intercepts events on all instances of the UI element, including events propagated from nested views.
		 * - Uses {@link ObservableObject.intercept()} to intercept events.
		 * - If a handler needs to re-emit the original event, call {@link ObservableObject.emit()} with `noIntercept` set to true.
		 * @param eventName The name of the event to handle.
		 * @param handle The function to call, or name of the event to emit instead.
		 * @returns The builder instance for chaining.
		 */
		handle(
			eventName: string,
			handle: string | ViewBuilderEventHandler<TView, any>,
		) {
			this.initializer.handle(eventName, handle);
			return this;
		}

		/**
		 * Adds an event handler for `KeyDown` events with the specified key name.
		 * - Key names are case sensitive (e.g. "Enter", "Escape", "ArrowUp", "Backspace").
		 * - Adds an event listener rather than intercepting, to avoid conflicts with other handlers.
		 * @param key The name of the key to handle.
		 * @param handle The function to call, or name of an event to emit.
		 * @returns The builder instance for chaining.
		 */
		handleKey(key: string, handle: string | ViewBuilderEventHandler<TView>) {
			if (!this._keyHandlers) {
				this._keyHandlers = {};
				this.initializer.finalize((view) => {
					view.listen((e) => {
						if (e.name !== "KeyDown") return;
						let handler = this._keyHandlers![e.data.key as string];
						if (typeof handler === "string") view.emit(handler, e.data);
						else if (handler) handler(e as any, view);
					});
				});
			}
			this._keyHandlers![key] = handle;
			return this;
		}

		/**
		 * Handles the `Click` event.
		 * @param handle The function to call, or name of the event to emit instead.
		 * @see {@link ElementBuilder.handle}
		 */
		onClick(handle: string | ViewBuilderEventHandler<TView>) {
			return this.handle("Click", handle);
		}

		/**
		 * Handles the `DoubleClick` event.
		 * @param handle The function to call, or name of the event to emit instead.
		 * @see {@link ElementBuilder.handle}
		 */
		onDoubleClick(handle: string | ViewBuilderEventHandler<TView>) {
			return this.handle("DoubleClick", handle);
		}

		/**
		 * Handles the `ContextMenu` event.
		 * @param handle The function to call, or name of the event to emit instead.
		 * @see {@link ElementBuilder.handle}
		 */
		onContextMenu(handle: string | ViewBuilderEventHandler<TView>) {
			return this.handle("ContextMenu", handle);
		}

		/**
		 * Handles the `Press` event.
		 * @param handle The function to call, or name of the event to emit instead.
		 * @see {@link ElementBuilder.handle}
		 */
		onPress(handle: string | ViewBuilderEventHandler<TView>) {
			return this.handle("Press", handle);
		}

		/**
		 * Handles the `Release` event.
		 * @param handle The function to call, or name of the event to emit instead.
		 * @see {@link ElementBuilder.handle}
		 */
		onRelease(handle: string | ViewBuilderEventHandler<TView>) {
			return this.handle("Release", handle);
		}

		/**
		 * Handles the `KeyDown` event.
		 * @param handle The function to call, or name of the event to emit instead.
		 * @see {@link ElementBuilder.handle}
		 */
		onKeyDown(
			handle: string | ViewBuilderEventHandler<TView, { key: string }>,
		) {
			return this.handle("KeyDown", handle);
		}

		/**
		 * Handles the `KeyUp` event.
		 * @param handle The function to call, or name of the event to emit instead.
		 * @see {@link ElementBuilder.handle}
		 */
		onKeyUp(handle: string | ViewBuilderEventHandler<TView, { key: string }>) {
			return this.handle("KeyUp", handle);
		}

		/**
		 * Handles the `FocusIn` event.
		 * @param handle The function to call, or name of the event to emit instead.
		 * @see {@link ElementBuilder.handle}
		 */
		onFocusIn(handle: string | ViewBuilderEventHandler<TView>) {
			return this.handle("FocusIn", handle);
		}

		/**
		 * Handles the `FocusOut` event.
		 * @param handle The function to call, or name of the event to emit instead.
		 * @see {@link ElementBuilder.handle}
		 */
		onFocusOut(handle: string | ViewBuilderEventHandler<TView>) {
			return this.handle("FocusOut", handle);
		}

		/**
		 * Handles the `Change` event.
		 * @param handle The function to call, or name of the event to emit instead.
		 * @see {@link ElementBuilder.handle}
		 */
		onChange(handle: string | ViewBuilderEventHandler<TView>) {
			return this.handle("Change", handle);
		}

		/**
		 * Handles the `Input` event.
		 * @param handle The function to call, or name of the event to emit instead.
		 * @see {@link ElementBuilder.handle}
		 */
		onInput(handle: string | ViewBuilderEventHandler<TView>) {
			return this.handle("Input", handle);
		}

		/**
		 * Handles the `BeforeRender` event, emitted before the element is rendered for the first time.
		 * @param handle The function to call, or name of the event to emit instead.
		 * @see {@link ElementBuilder.handle}
		 */
		onBeforeRender(handle: string | ViewBuilderEventHandler<TView>) {
			return this.handle("BeforeRender", handle);
		}

		/**
		 * Handles the `Rendered` event, emitted when the element has been rendered.
		 * @param handle The function to call, or name of the event to emit instead.
		 * @see {@link ElementBuilder.handle}
		 */
		onRendered(handle: string | ViewBuilderEventHandler<TView>) {
			return this.handle("Rendered", handle);
		}

		// --- helper functions

		/** @internal Helper method to set a property on the view instance. */
		protected setProperty(name: keyof TView, value: any) {
			this.initializer.set(name as any, value);
			return this;
		}

		/** @internal Helper method to set a style override. */
		protected setStyleOverride<K extends keyof StyleOverrides>(
			key: K,
			value: BindingOrValue<StyleOverrides[K] | string>,
			getColor?: boolean,
		) {
			if (isBinding(value)) {
				// add callback to observe binding and add style dynamically
				this.initializer.finalize((view) => {
					view.observe(value, function (v) {
						if (getColor && typeof v === "string") {
							v = UIColor.getColor(v);
						}
						view.setStyle({ [key]: v });
					});
				});
			} else {
				// collect all overrides and set in one go
				this._getStyleOverrides()[key] = (
					getColor && typeof value === "string"
						? UIColor.getColor(value)
						: value
				) as any;
			}
			return this;
		}

		/** @internal Creates or returns style overrides that are applied using a callback. */
		private _getStyleOverrides(): StyleOverrides {
			if (this._styleOverrides) return this._styleOverrides;

			let overrides = (this._styleOverrides = {});
			this.initializer.finalize((view) => {
				view.setStyle(overrides);
			});
			return overrides;
		}

		/** @internal Combined style overrides to be applied once on finalization. */
		private _styleOverrides?: StyleOverrides;

		/** @internal Key handlers, if interceptor has been added. */
		private _keyHandlers?: {
			[key: string]: string | ViewBuilderEventHandler<TView>;
		};
	}
}
