import { ViewClass, ViewComposite } from "../../app/index.js";
import { ManagedEvent, Observer } from "../../core/index.js";
import { UICell, UIContainer } from "../containers/index.js";
import { UIControl } from "../controls/index.js";
import { UIComponent } from "../UIComponent.js";
import { UIStyle } from "../UIStyle.js";

/**
 * A view composite that overrides the (partial) style of the contained view
 *
 * @description A style controller component overrides styles, and/or automatically applies a style based on the value of its {@link state} property.
 *
 * **JSX tag:** `<style>`
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export class UIStyleController extends ViewComposite {
	/**
	 * Creates a preset controller class with the specified property values, bindings, and event handlers
	 * @param preset Property values, bindings, and event handlers
	 * @returns A class that can be used to create instances of this view class with the provided property values, bindings, and event handlers
	 */
	static with(
		preset: UIComponent.ViewPreset<
			ViewComposite,
			UIStyleController,
			| "state"
			| "dimensions"
			| "position"
			| "textStyle"
			| "containerLayout"
			| "decoration"
		> & {
			style?: UIStyle | `@${string}`;
		},
		Body: ViewClass
	): typeof UIStyleController {
		return class PresetView extends this {
			constructor() {
				super();

				// copy preset to be able to apply named theme style
				preset = { ...preset };
				if (typeof preset.style === "string")
					preset.style = new UIStyle(preset.style);
				this.applyViewPreset(preset);
			}
			protected override createView() {
				return new Body();
			}
		};
	}

	constructor() {
		super();
		new UIStyleControllerObserver().observe(this);
	}

	/** True if style should be applied, defaults to true */
	state? = true;

	/** The style that should be applied when the state property is true */
	style?: UIStyle = undefined;

	/** Style override to be applied on top of style definitions from {@link style} */
	dimensions?: UIStyle.Definition.Dimensions = undefined;

	/** Style override to be applied on top of style definitions from {@link style} */
	position?: UIStyle.Definition.Position = undefined;

	/** Style override to be applied on top of style definitions from {@link style} */
	textStyle?: UIStyle.Definition.TextStyle = undefined;

	/** Style override to be applied on top of style definitions from {@link style} */
	containerLayout?: UIStyle.Definition.ContainerLayout = undefined;

	/** Style override to be applied on top of style definitions from {@link style} */
	decoration?: UIStyle.Definition.Decoration = undefined;

	protected override delegateViewEvent(event: ManagedEvent) {
		return super.delegateViewEvent(event) || !!this.emit(event);
	}
}

/** @internal */
class UIStyleControllerObserver extends Observer<UIStyleController> {
	override observe(observed: UIStyleController) {
		this._observing = false;
		return super.observe(observed).observeProperty("body");
	}
	private _observing?: boolean;

	/** Base style (taken from the UI component right after it's assigned to the `view` property) */
	baseStyle?: UIStyle;

	/** Last found style; checked to see if need to reapply overrides */
	lastFound?: UIStyle;

	/** Last computed style */
	lastStyle?: UIStyle;

	protected override handlePropertyChange(property: string, value: any) {
		let composite = this.observed;
		if (!composite) return;
		if (property === "body") {
			let body = this.handleBodyChange();
			if (!body) return;
			if (!this._observing) {
				this._observing = true;
				this.observeProperty(
					"state",
					"style",
					"dimensions",
					"position",
					"textStyle",
					"containerLayout",
					"decoration"
				);
			}
		}

		// handle style changes
		let view = composite.body;
		if (!this.baseStyle || !(view instanceof UIComponent)) return;

		// get or make the appropriate style to apply
		let style =
			typeof composite.style === "string"
				? new UIStyle(composite.style)
				: composite.style || this.baseStyle;
		if (
			this.lastFound !== style ||
			(property !== "style" && property !== "body")
		) {
			this.lastFound = style;
			if (
				composite.dimensions ||
				composite.position ||
				composite.textStyle ||
				composite.containerLayout ||
				composite.decoration
			) {
				style = style.extend(composite);
			}
			this.lastStyle = style;
		}

		// apply appropriate style (base style or new style)
		view.style = (composite.state && this.lastStyle) || this.baseStyle;
	}

	handleBodyChange(): UIComponent | undefined {
		let composite = this.observed!;

		// save base style from new view
		let view = composite.body;
		if (view instanceof UIComponent) {
			let baseStyle = view.style;
			let overrides: Partial<UIStyle.Definition> = Object.create(null);
			let overridden: any;
			if (UIStyle.isStyleOverride(view.dimensions, baseStyle)) {
				overridden = overrides.dimensions = view.dimensions;
			}
			if (UIStyle.isStyleOverride(view.position, baseStyle)) {
				overridden = overrides.position = view.position;
			}
			if (view instanceof UIContainer) {
				if (UIStyle.isStyleOverride(view.layout, baseStyle)) {
					overridden = overrides.containerLayout = view.layout;
				}
				if (view instanceof UICell) {
					if (UIStyle.isStyleOverride(view.decoration, baseStyle)) {
						overridden = overrides.decoration = view.decoration;
					}
				}
			}
			if (view instanceof UIControl) {
				if (UIStyle.isStyleOverride(view.decoration, baseStyle)) {
					overridden = overrides.decoration = view.decoration;
				}
				if (UIStyle.isStyleOverride(view.textStyle, baseStyle)) {
					overridden = overrides.textStyle = view.textStyle;
				}
			}
			this.baseStyle = overridden ? baseStyle.extend(overrides) : baseStyle;
			return view;
		}
	}
}
