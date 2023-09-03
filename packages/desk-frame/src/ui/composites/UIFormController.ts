import { Binding, ManagedEvent } from "../../core/index.js";
import { ViewClass, ViewComposite } from "../../app/index.js";
import { UIFormContext } from "../UIFormContext.js";

/**
 * A view composite that defines a form context to be used within the contained view
 *
 * @description A form controller component creates and renders its content, providing a {@link formContext} property that's used by nested UI components.
 *
 * **JSX tag:** `<formcontext>`
 *
 * @note The {@link UIForm} component also contains a `formContext` property, and is itself a (column) container, which can therefore contain multiple components that are laid out vertically. Only use the UIFormController class in cases where the form itself isn't contained in a column component.
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export class UIFormController extends ViewComposite {
	/**
	 * Creates a preset controller class with the specified property values, bindings, and event handlers
	 * @param preset Property values, bindings, and event handlers
	 * @returns A class that can be used to create instances of this view class with the provided property values, bindings, and event handlers
	 */
	static with(
		preset: { formContext?: Binding<any> },
		Body: ViewClass,
	): typeof UIFormController;
	static with(Body: ViewClass): typeof UIFormController;
	static with(
		preset?: ViewClass | { formContext?: Binding<any> },
		Body?: ViewClass,
	) {
		if (typeof preset === "function") {
			Body = preset;
			preset = undefined;
		}
		return class PresetView extends this {
			constructor() {
				super();
				if (preset) this.applyViewPreset({ ...preset });
			}
			protected override createView() {
				return new Body!();
			}
		};
	}

	/**
	 * Form state context object
	 * - This object is used by contained input elements, to get and set input values.
	 * - This property defaults to an empty {@link UIFormContext} object, but can be bound to a property of a containing view or view activity object.
	 */
	formContext? = new UIFormContext();

	/**
	 * Implementation of {@link ViewComposite.delegateViewEvent}, emits events with the `delegate` property set to this object
	 */
	protected override delegateViewEvent(event: ManagedEvent) {
		return (
			super.delegateViewEvent(event) ||
			!!this.emit(
				new ManagedEvent(event.name, event.source, event.data, this, event),
			)
		);
	}
}
