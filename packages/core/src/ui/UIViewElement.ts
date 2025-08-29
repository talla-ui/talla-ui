import type { StringConvertible } from "@talla-ui/util";
import { AppContext, RenderContext, View, ViewBuilder } from "../app/index.js";
import { err, ERROR } from "../errors.js";
import {
	Binding,
	BindingOrValue,
	isBinding,
	ObservableEvent,
	ObservableObject,
} from "../object/index.js";
import { UIColor, UIStyle } from "./style/index.js";
import type { UI } from "./UI.js";

/** Empty array, used for findViewContent */
const _emptyViewContent: any[] = Object.freeze([]) as any;

/** @internal Helper function to check if a style is an instance */
function isStyleInstance(
	style?: UIStyle | UIStyle.StyleOptions,
): style is UIStyle {
	return !!style && "override" in style && typeof style.override === "function";
}

/** @internal Helper function to emit a non-propagated event; returns true */
function emitRendered(source: View, name: string) {
	source.emit(
		new ObservableEvent(name, source, undefined, undefined, undefined, true),
	);
	return true;
}

/**
 * Base class for built-in UI view elements
 *
 * This class provides common infrastructure for UI controls and containers such as {@link UIButton} and {@link UIColumn}. The UIViewElement class is an abstract class and can't be instantiated or rendered on its own.
 *
 * @online_docs Refer to the online documentation for more information on using UI elements.
 * @docgen {hideconstructor}
 */
export abstract class UIViewElement extends View {
	/**
	 * An identifier for this view element
	 * - Identifiers don't have to be unique, but can be used to identify elements in a part of the view hierarchy.
	 * - Depending on the platform, this identifier may be exposed in the rendered output (e.g. HTML attribute).
	 */
	name?: string;

	/**
	 * True if the element should be hidden from view
	 * - UI elements may still be rendered even if they're hidden. However, container content isn't rendered while containers themselves are hidden.
	 * - Alternatively, use {@link UIShowView} to show and hide content dynamically.
	 * @see UIShowView
	 * @see when()
	 * @see unless()
	 */
	hidden = false;

	/** Style definition for this element, either as an instance or an object with overrides */
	style?: UIStyle | UIStyle.StyleOptions = undefined;

	/**
	 * Options related to the position of this element
	 * - If set, these options replace the defaults for the type of element.
	 */
	position?: Readonly<UIViewElement.Position> = undefined;

	/** WAI-ARIA role for this element, if applicable */
	accessibleRole?: StringConvertible;

	/** WAI-ARIA label text for this element (not tooltip), if applicable */
	accessibleLabel?: StringConvertible;

	/**
	 * Requests input focus on this element
	 * - This method emits an event, which is handled by the renderer if and when possible.
	 */
	requestFocus() {
		emitRendered(this, "RequestFocus");
	}

	/**
	 * Requests input focus for the next sibling element
	 * - This method emits an event, which is handled by the renderer if and when possible.
	 */
	requestFocusNext() {
		emitRendered(this, "RequestFocusNext");
	}

	/**
	 * Requests input focus for the previous sibling element
	 * - This method emits an event, which is handled by the renderer if and when possible.
	 */
	requestFocusPrevious() {
		emitRendered(this, "RequestFocusPrevious");
	}

	/**
	 * Triggers asynchronous rendering for this element, and all contained elements, if any
	 * - This method is invoked automatically, and should not be called by application code. However, it may be overridden to implement a UI element with custom platform-specific rendering code.
	 * @param callback A render callback, usually provided by a container or the application {@link RenderContext} instance
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
			undefined,
			true,
		);
		this.emit(event);
	}

	/** Implementation of {@link View.findViewContent()}, returns an empty array unless overridden */
	override findViewContent<T extends View>(
		type: new (...args: any[]) => T,
	): T[] {
		return _emptyViewContent;
	}

	/** Last rendered output, if any; set by the UI element renderer */
	lastRenderOutput?: RenderContext.Output;

	private _renderer?: any;
}

export namespace UIViewElement {
	/**
	 * Options for positioning within parent element(s)
	 * @see {@link UIViewElement.position}
	 */
	export type Position = {
		/** Position of the element in the direction perpendicular to the distribution axis of the parent element, or `overlay` if the element should be placed on top of other elements (i.e. CSS absolute positioning) */
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

	/**
	 * Abstract base class for UI view element builders
	 *
	 * @description
	 * This class provides a fluent interface for creating and configuring {@link UIViewElement} instances: all built-in containers and controls. It includes a range of methods for setting properties, styles, and behaviors, which are applied to an 'initializer', and eventually to all instances created using the same builder. The builder is typically returned by a function that returns a view builder for a specific type of UI element, such as `UI.Column()`, `UI.Button()`, or `UI.ShowWhen()`.
	 *
	 * Objects of this type are returned by functions such as `UI.Button()`, `UI.Label()`, and `UI.Column()`, with additional methods as included in their specific return type (e.g. {@link UIButton.ButtonBuilder}).
	 */
	export abstract class ElementBuilder<TView extends UIViewElement>
		implements ViewBuilder<TView>
	{
		/** The initializer instance that handles the actual view configuration */
		abstract readonly initializer: ViewBuilder.Initializer<TView>;

		/**
		 * Creates a new instance of the UI element.
		 * @returns A newly created and initialized UI element instance.
		 */
		create() {
			return this.initializer.create();
		}

		/**
		 * Intercepts an event and re-emits it with a different name or calls a function.
		 * @param eventName The name of the event to intercept
		 * @param alias The new event name to emit, or a function to call
		 * @param data The data properties to add to the alias event, if any
		 * @param forward Whether to forward the original event as well (defaults to false)
		 * @returns The builder instance for chaining.
		 */
		intercept(
			eventName: string,
			alias: string | ObservableObject.InterceptHandler<TView>,
			data?: Record<string, unknown>,
			forward?: boolean,
		) {
			this.initializer.intercept(eventName, alias, data, forward);
			return this;
		}

		/**
		 * Runs a builder modifier function, returning its result
		 *
		 * @description
		 * This method provides a convenient way to call a function that takes the builder itself as an argument, and returns either the same or another builder, from within a chain of other method calls. The modifier may call additional methods on the builder, use its initializer directly, or return a new builder that encapsulates the current one.
		 *
		 * @param modifier A function that takes the current builder instance and applies configurations.
		 * @returns The result of the modifier function.
		 *
		 * @example
		 * function limitCellWidth(b: cell.Builder) {
		 *   return b.width(200, 100).shrink();
		 * }
		 * let myCell = cell("Hello").apply(limitCellWidth);
		 */
		apply<TResult>(modifier: (builder: this) => TResult): TResult {
			return modifier(this);
		}

		// --- base properties

		/**
		 * Sets the element name, which can be used to identify the element in the view hierarchy
		 * @param value The element name, or a binding to a string value.
		 * @returns The builder instance for chaining.
		 */
		name(value?: BindingOrValue<string | undefined>) {
			return this.setProperty("name", value);
		}

		/**
		 * Sets the WAI-ARIA role for accessibility, using {@link UIViewElement.accessibleRole}
		 * @param value The role name (e.g., "button", "navigation").
		 * @returns The builder instance for chaining.
		 */
		accessibleRole(value?: BindingOrValue<string | undefined>) {
			return this.setProperty("accessibleRole", value);
		}

		/**
		 * Sets the WAI-ARIA label for accessibility, using {@link UIViewElement.accessibleLabel}
		 * @param value The accessible label text.
		 * @returns The builder instance for chaining.
		 */
		accessibleLabel(value?: BindingOrValue<string | undefined>) {
			return this.setProperty("accessibleLabel", value);
		}

		/**
		 * Hides the element when a specified condition is true, using {@link UIViewElement.hidden}
		 * @note Elements are still rendered even when they're hidden. Alternatively, use `UI.ShowWhen()` or `UI.ShowUnless()` to render views conditionally.
		 * @param condition A value or binding. If the value is truthy, the element will be hidden.
		 * @returns The builder instance for chaining.
		 */
		hideWhen(condition: BindingOrValue<any>) {
			this.initializer.update(condition, function (value) {
				this.hidden = !!value;
			});
			return this;
		}

		/**
		 * Sets the position of the element within its parent, using {@link UIViewElement.position}
		 * @param position A `UIViewElement.Position` object, or a gravity string (`start`, `center`, `end`, etc.).
		 * @param top The top offset (used if `position` is a gravity string).
		 * @param end The end offset (used if `position` is a gravity string).
		 * @param bottom The bottom offset (used if `position` is a gravity string).
		 * @param start The start offset (used if `position` is a gravity string).
		 * @returns The builder instance for chaining.
		 */
		position(
			position?: BindingOrValue<
				UIViewElement.Position | UIViewElement.Position["gravity"] | undefined
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

		// --- style: dimensions

		/**
		 * Sets both the width and height of the element.
		 * @param width The width value, in pixels or string with unit
		 * @param height The height value (if different from width), in pixels or string with unit
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
		 * Sets the outer, minimum and/or maximum width of the element.
		 * @param width The target width, in pixels or string with unit
		 * @param minWidth The minimum width, in pixels or string with unit
		 * @param maxWidth The maximum width, in pixels or string with unit
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
		 * @param minWidth The minimum width, in pixels or string with unit
		 * @returns The builder instance for chaining.
		 */
		minWidth(minWidth?: BindingOrValue<string | number | undefined>) {
			return this.setStyleOverride("minWidth", minWidth);
		}

		/**
		 * Sets the maximum width of the element.
		 * @param maxWidth The maximum width, in pixels or string with unit
		 * @returns The builder instance for chaining.
		 */
		maxWidth(maxWidth?: BindingOrValue<string | number | undefined>) {
			return this.setStyleOverride("maxWidth", maxWidth);
		}

		/**
		 * Sets the outer, minimum and/or maximum height of the element.
		 * @param height The target height, in pixels or string with unit
		 * @param minHeight The minimum height, in pixels or string with unit
		 * @param maxHeight The maximum height, in pixels or string with unit
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
		 * @param minHeight The minimum height, in pixels or string with unit
		 * @returns The builder instance for chaining.
		 */
		minHeight(minHeight?: BindingOrValue<string | number | undefined>) {
			return this.setStyleOverride("minHeight", minHeight);
		}

		/**
		 * Sets the maximum height of the element.
		 * @param maxHeight The maximum height, in pixels or string with unit
		 * @returns The builder instance for chaining.
		 */
		maxHeight(maxHeight?: BindingOrValue<string | number | undefined>) {
			return this.setStyleOverride("maxHeight", maxHeight);
		}

		/**
		 * Sets the flex-grow factor of the element.
		 * @param grow A number, or `true` for a grow factor of 1. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		grow(grow: BindingOrValue<number | boolean> = true) {
			return this.setStyleOverride("grow", grow);
		}

		/**
		 * Sets the flex-shrink factor of the element.
		 * @param shrink A number, or `true` for a shrink factor of 1. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		shrink(shrink: BindingOrValue<number | boolean> = true) {
			return this.setStyleOverride("shrink", shrink);
		}

		// --- style: decoration

		/**
		 * Sets the padding around the element.
		 * @param padding An object with offsets (`top`, `bottom`, `x`, etc.), a single number, or "gap" for the current default gap size. Defaults to `"gap"`. Values should be specified in pixels or as a string with unit.
		 * @returns The builder instance for chaining.
		 */
		padding(padding: BindingOrValue<UIStyle.Offsets | undefined> = "gap") {
			return this.setStyleOverride("padding", padding);
		}

		/**
		 * Sets the margin around the element.
		 * @param margin An object with offsets (`top`, `bottom`, `x`, etc.), a single number, or "gap" for the current default gap size. Defaults to `"gap"`. Values should be specified in pixels or as a string with unit.
		 * @returns The builder instance for chaining.
		 */
		margin(margin: BindingOrValue<UIStyle.Offsets | undefined> = "gap") {
			return this.setStyleOverride("margin", margin);
		}

		/**
		 * Sets the text color.
		 * @param color A `UIColor` instance, or a theme color name (e.g. "text", "primary"). Defaults to `"text"`.
		 * @returns The builder instance for chaining.
		 */
		textColor(
			color: BindingOrValue<UIColor | UI.ColorName | undefined> = "text",
		) {
			return this.setStyleOverride("textColor", color, UIColor.theme);
		}

		/** Alias for {@link textColor}, sets the text color */
		fg(color?: BindingOrValue<UIColor | UI.ColorName | undefined>) {
			return this.textColor(color);
		}

		/**
		 * Sets the background color.
		 * @param color A `UIColor` instance, or a theme color name (e.g. "background", "primary"). Defaults to `"background"`.
		 * @returns The builder instance for chaining.
		 */
		background(
			color: BindingOrValue<UIColor | UI.ColorName | undefined> = "background",
		) {
			return this.setStyleOverride("background", color, UIColor.theme);
		}

		/** Alias for {@link background}, sets the background color */
		bg(color?: BindingOrValue<UIColor | UI.ColorName | undefined>) {
			return this.background(color);
		}

		/**
		 * Sets the border properties of the element.
		 * @param borderWidth The width of the border (all sides), in pixels or string with unit. Defaults to 1.
		 * @param borderColor The color of the border, defaults to the theme divider color.
		 * @param borderStyle The style of the border (e.g. "solid", "dashed").
		 * @param borderRadius The radius of the border corners, in pixels or string with unit.
		 * @returns The builder instance for chaining.
		 */
		border(
			borderWidth: BindingOrValue<UIStyle.Offsets | undefined> = 1,
			borderColor?: BindingOrValue<UIColor | UI.ColorName | undefined>,
			borderStyle?: BindingOrValue<string | undefined>,
			borderRadius?: BindingOrValue<
				UIStyle.StyleOptions["borderRadius"] | undefined
			>,
		) {
			if (borderWidth != null) {
				this.setStyleOverride("borderWidth", borderWidth);
				if (!borderColor) borderColor = UIColor.theme.ref("divider");
			}
			if (borderColor)
				this.setStyleOverride("borderColor", borderColor, UIColor.theme);
			if (borderStyle) this.setStyleOverride("borderStyle", borderStyle);
			if (borderRadius != null)
				this.setStyleOverride("borderRadius", borderRadius);
			return this;
		}

		/**
		 * Sets the radius of the border corners.
		 * @param radius A number, or "gap" for the current default gap size. Defaults to `"gap"`. Values should be specified in pixels or as a string with unit.
		 * @returns The builder instance for chaining.
		 */
		borderRadius(
			radius: BindingOrValue<
				UIStyle.StyleOptions["borderRadius"] | undefined
			> = "gap",
		) {
			return this.setStyleOverride("borderRadius", radius);
		}

		/**
		 * Adds a drop shadow effect.
		 * @param dropShadow The drop shadow height, in pixels, approximate blur distance; negative values for inset shadows. Defaults to 8.
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
		 * @param dim If `true`, sets opacity to 0.5. If `false`, sets it to 1. Defaults to `true`.
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
		 * @param cursor A CSS cursor name (e.g. "pointer", "default"). Defaults to `"default"`.
		 * @returns The builder instance for chaining.
		 */
		cursor(cursor: BindingOrValue<string | undefined> = "default") {
			return this.setStyleOverride("cursor", cursor);
		}

		// --- style: typography

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
		 * @param size The font size, in pixels or string with unit
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
		 * @param bold If `true`, applies bold styling. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		bold(bold: BindingOrValue<boolean | undefined> = true) {
			return this.setStyleOverride("bold", bold);
		}

		/**
		 * Makes the text italic.
		 * @param italic If `true`, applies italic styling. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		italic(italic: BindingOrValue<boolean | undefined> = true) {
			return this.setStyleOverride("italic", italic);
		}

		/**
		 * Adds an underline to the text.
		 * @param underline If `true`, underlines the text. Defaults to `true`.
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
		textAlign(
			align?: BindingOrValue<UIStyle.StyleOptions["textAlign"] | undefined>,
		) {
			return this.setStyleOverride("textAlign", align);
		}

		// --- delayed initialization

		/**
		 * Requests input focus for this element after it has been rendered.
		 * @returns The builder instance for chaining.
		 */
		requestFocus() {
			this.initializer.finalize((view) => {
				setTimeout(() => view.requestFocus(), 1);
			});
			return this;
		}

		// --- helper functions

		/** @internal Helper method to set a property on the view instance */
		protected setProperty(name: keyof TView, value: any) {
			this.initializer.set(name as any, value);
			return this;
		}

		/** @internal Helper method to set a style override */
		protected setStyleOverride<K extends keyof UIStyle.StyleOptions>(
			key: K,
			value: BindingOrValue<UIStyle.StyleOptions[K]>,
		): this;
		protected setStyleOverride<K extends keyof UIStyle.StyleOptions>(
			key: K,
			value: BindingOrValue<UIStyle.StyleOptions[K] | string>,
			resolver?: UIStyle.ThemeResolver<any, string>,
		): this;
		protected setStyleOverride<K extends keyof UIStyle.StyleOptions>(
			key: K,
			value: BindingOrValue<any>,
			resolver?: UIStyle.ThemeResolver<UIStyle.StyleOptions[K], string>,
		) {
			function addOverride(view: TView, overrides: UIStyle.StyleOptions) {
				if (isStyleInstance(view.style)) {
					view.style = view.style.override(overrides);
				} else {
					view.style = { ...view.style, ...overrides };
				}
			}
			if (isBinding(value)) {
				// set override dynamically, along with all bound overrides
				if (!this._boundOverrides) {
					this._boundOverrides = {};
					this._boundRes = {};
					this.initializer.finalize((view) => {
						for (let key in this._boundOverrides) {
							let res = this._boundRes![key];
							view.observe(this._boundOverrides[key]!, function (value) {
								if (res && typeof value === "string") {
									value = res.ref(value);
								}
								addOverride(view, { [key]: value });
							});
						}
					});
				}
				this._boundOverrides[key] = value;
				this._boundRes![key] = resolver;
			} else {
				// set override only once, using finalize
				if (!this._staticOverrides) {
					this._staticOverrides = {};
					this.initializer.finalize((view) => {
						addOverride(view, this._staticOverrides!);
					});
				}
				if (resolver && typeof value === "string") {
					value = resolver.ref(value);
				}
				this._staticOverrides[key] = value;
			}
			return this;
		}

		/** @internal Helper function to set the style property, while keeping intended overrides */
		protected setStyleProperty(
			style: BindingOrValue<
				UIStyle | UIStyle.StyleOptions | string | undefined
			>,
			resolver?: UIStyle.ThemeResolver<UIStyle, string>,
		) {
			if (isBinding(style)) {
				this.initializer.finalize((view) => {
					let keys = Object.keys({
						...this._staticOverrides,
						...this._boundOverrides,
					});
					view.observe(style, function (value) {
						// figure out which overrides to keep
						let overrides =
							((isStyleInstance(view.style)
								? view.style.getOverrides()
								: view.style) as any) || {};
						let keep: any = {};
						for (let key of keys) keep[key] = overrides[key];

						// set the style value with overrides
						if (typeof value === "string") value = resolver?.ref(value);
						if (isStyleInstance(value)) view.style = value.override(keep);
						else view.style = { ...keep, ...value };
					});
				});
			} else {
				this.initializer.initialize((view) => {
					// set the style directly first (overrides applied later)
					view.style =
						typeof style === "string"
							? resolver?.ref(style)
							: (style as UIStyle | UIStyle.StyleOptions);
				});
			}
			return this;
		}

		/** @internal Combined style overrides to be applied once on finalization. */
		private _staticOverrides?: UIStyle.StyleOptions;

		/** @internal Bound style overrides to be applied */
		private _boundOverrides?: { [key: string]: Binding };

		/** @internal Resolvers for bound style overrides */
		private _boundRes?: {
			[key: string]: UIStyle.ThemeResolver<any, string> | undefined;
		};
	}
}
