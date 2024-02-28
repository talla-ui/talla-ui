import type { ManagedEvent } from "../../base/index.js";
import type { View } from "../../app/index.js";
import { UIFormContext } from "../UIFormContext.js";
import { UIColumn } from "./UIColumn.js";

/**
 * A view class for a column container that can be used to bind form controls to a single {@link UIFormContext}
 *
 * @description A form container functions like a regular column container component, but includes a {@link formContext} property that's used to manage input values.
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export class UIForm extends UIColumn {
	/** Creates a new form container (column) view object with the provided view content */
	constructor(...content: View[]) {
		super(...content);
		this.accessibleRole = "form";
	}

	/**
	 * Applies the provided preset properties to this object
	 * - This method is called automatically. Do not call this method after constructing a UI component.
	 */
	override applyViewPreset(
		preset: View.ViewPreset<UIColumn, this, "formContext"> & {
			/** Event that's emitted when the form is submitted */
			onSubmit?: string;
		},
	) {
		super.applyViewPreset(preset);
	}

	/**
	 * Form state context object
	 * - This object is used by contained input elements, to get and set input values.
	 * - This property defaults to an empty {@link UIFormContext} object, but can be bound to a property of a containing view or activity object.
	 */
	formContext? = new UIFormContext();

	protected override delegateContentEvent(event: ManagedEvent) {
		return super.delegateContentEvent(event, true);
	}
}
