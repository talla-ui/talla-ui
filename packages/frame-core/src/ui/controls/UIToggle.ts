import type { View } from "../../app/index.js";
import { ManagedEvent, Observer, StringConvertible } from "../../base/index.js";
import { UIComponent } from "../UIComponent.js";
import { UIFormContext, _boundFormContext } from "../UIFormContext.js";
import type { UIStyle } from "../UIStyle.js";

/**
 * A view control that represents a checkbox or toggle input
 *
 * @description A toggle component is rendered on-screen as a checkbox or toggle control that can be switched on and off by the user.
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export class UIToggle extends UIComponent {
	/** Creates a new toggle view object with the specified label */
	constructor(label?: StringConvertible, state?: boolean) {
		super();
		this.label = label;
		this.state = !!state;

		_boundFormContext.bindTo(this, "formContext");
		new UIToggleObserver().observe(this);
	}

	/**
	 * Applies the provided preset properties to this object
	 * - This method is called automatically. Do not call this method after constructing a UI component.
	 */
	override applyViewPreset(
		preset: View.ViewPreset<
			UIComponent,
			this,
			"label" | "state" | "formField" | "disabled" | "style" | "labelStyle"
		> & {
			/** Event that's emitted when the toggle state has changed */
			onChange?: string;
		},
	) {
		// quietly change 'text' to label to support JSX tag content
		if ("text" in (preset as any)) {
			preset.label = (preset as any).text;
			delete (preset as any).text;
		}
		super.applyViewPreset(preset);
	}

	/** The current toggle state, true for toggle 'on' state */
	state;

	/** The toggle label to be displayed, if any */
	label?: StringConvertible;

	/** Form context field name, used with {@link UIFormContext} */
	formField?: string = undefined;

	/**
	 * The nearest containing form context
	 * - This property is bound automatically, such that it refers to the `formContext` property of the nearest container or view composite.
	 * @see {@link UIFormContext}
	 */
	formContext?: UIFormContext;

	/** True if user input should be disabled on this control */
	disabled = false;

	/** The style to be applied to the toggle control as a whole */
	style?: UIStyle.TypeOrOverrides<UIToggle.StyleType> = undefined;

	/** The style to be applied to the toggle label */
	labelStyle?: UIStyle.TypeOrOverrides<UIToggle.LabelStyleType> = undefined;
}

export namespace UIToggle {
	/** The type definition for styles applicable to {@link UIToggle.style} */
	export type StyleType = UIComponent.DimensionsStyleType & {
		/** Padding within control element (in pixels or CSS string, or separate offset values) */
		padding?: UIComponent.Offsets;
		/** Opacity (0-1) */
		opacity?: number;
		/** Miscellaneous CSS attributes */
		css?: Partial<CSSStyleDeclaration>;
		/** Miscellaneous CSS class names (array) */
		cssClassNames?: string[];
	};

	/** The type definition for styles applicable to {@link UIToggle.labelStyle} */
	export type LabelStyleType = UIComponent.DecorationStyleType &
		UIComponent.TextStyleType;
}

/** @internal Toggle UI component observer to manage the input value automatically */
class UIToggleObserver extends Observer<UIToggle> {
	override observe(observed: UIToggle) {
		return super.observe(observed).observeProperty("formContext", "formField");
	}
	onFormFieldChange() {
		this.onFormContextChange();
	}
	onFormContextChange() {
		if (this.observed && this.observed.formContext && this.observed.formField) {
			let value = this.observed.formContext.get(this.observed.formField);
			this.observed.state = !!value;
		}
	}
	protected override handleEvent(event: ManagedEvent) {
		if (event.name === "Change") {
			let cb = this.observed;
			if (cb && cb.formContext && cb.formField) {
				cb.formContext.set(cb.formField, cb.state, true);
			}
		}
	}
}
