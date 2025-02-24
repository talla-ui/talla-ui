import { View } from "./index.js";
import { Binding, ObservedObject, ObjectReader } from "../base/index.js";

/** An object that can be used to create bindings for properties of the nearest `formContext` property */
export const $form = Binding.createFactory<
	| "values"
	| `values.${string}`
	| "errors"
	| `errors.${string}`
	| "errorCount"
	| "valid"
>("formContext", "formContext");

/**
 * An object that contains form field data and validation rules
 *
 * @description
 * The FormContext class provides a data model for user input, allowing UI elements to read and write data from/to a single form context object — instead of having to use individual bindings and event handlers for each field.
 *
 * The form context object provides methods to get, set, and clear field values, as well as a way to validate current values according to a schema or custom validation functions. Form values and validation errors can be bound to any other view properties to be displayed in the UI.
 *
 * The validation schema follows the type definition from {@link ObjectReader.Schema}, since validation takes place using {@link ObjectReader}. Errors must be set as text (strings, or the result of {@link strf()}) on the `err` properties within the validation schema, since default error messages are not included for any language.
 *
 * To use a FormContext object with {@link UITextField} or {@link UIToggle} input elements (or e.g. a custom UI component), set their `formField` property to a field name. The input view object automatically binds to a `formContext` property from the current activity or UI component, and gets/sets the input value when needed.
 *
 * @example
 * const FormView = ui.column(
 *   ui.textField({ formField: "foo" }),
 *   ui.label({
 *     style: myStyles.errorLabel,
 *     hidden: $activity.not("formContext.errors.foo"),
 *     text: $activity.string("formContext.errors.foo.message")
 *   }),
 *   ui.button("Go", { onClick: "Submit" })
 * );
 *
 * class MyActivity extends Activity {
 *   protected createView() {
 *     return new formView();
 *   }
 *
 *   formContext = new FormContext({
 *     foo: {
 *       string: { required: { err: "Foo is required" } }
 *     }
 *   });
 *
 *   onSubmit() {
 *     let values = this.formContext.validate();
 *     // now, values.foo is a string with length > 0,
 *     // OR otherwise
 *     // - values is undefined, and
 *     // - this.formContext.valid is false, and
 *     // - this.formContext.errors.foo.message is "Foo is required"
 *   }
 * }
 */
export class FormContext<
	TSchema extends ObjectReader.Schema = Record<string, ObjectReader.SchemaRule>,
> extends ObservedObject {
	/** Creates a new instance with the provided validation schema and/or values */
	constructor(
		schemaOrReader?: TSchema | ObjectReader<TSchema>,
		values?: Partial<Record<keyof TSchema, unknown>>,
	) {
		super();
		if (schemaOrReader) {
			this._reader =
				schemaOrReader instanceof ObjectReader
					? schemaOrReader
					: new ObjectReader(schemaOrReader);
		}
		if (values) Object.assign(this._values, values);
	}

	/**
	 * An object that contains current form field values
	 * - Do not set field values here. Instead, use the {@link FormContext.set()} method to update field values.
	 * - These values are not (necessarily) valid. To validate form fields and get the result, use the {@link validate()} method.
	 * - Properties of this object can be bound, e.g. to display form fields elsewhere in the view.
	 * @readonly
	 */
	get values(): Readonly<Partial<Record<keyof TSchema, unknown>>> {
		return this._values as any;
	}
	private _values: Record<string, unknown> = Object.create(null);

	/**
	 * An object that contains validation errors, if any
	 * - Errors are set by the {@link validate()} method, as well as by the {@link set()} method but only after {@link validate()} has been called at least once.
	 * - Errors (and values) can be cleared using the {@link clear()} method.
	 * @readonly
	 */
	get errors(): Readonly<{ [name in keyof TSchema]?: Error }> {
		return this._errors;
	}
	private _errors: { [name in keyof TSchema]?: Error } = Object.create(null);

	/**
	 * True if there are currently no recorded errors.
	 * - This field is updated by the {@link validate()} method, as well as by the {@link set()} method but only after {@link validate()} has been called at least once. Before then, this field is always `true`.
	 * - This field is set back to `true` by the {@link clear()} method.
	 * @readonly
	 */
	get valid() {
		return this._valid;
	}
	private _valid = true;

	/**
	 * Sets the value of the specified form field
	 * @summary This method sets a form field to the provided value. If the {@link validate()} method has been called at least once (and {@link clear()} hasn't been called after that), the new field value is also checked against the validation schema, updating the {@link errors} and {@link valid} properties. If the new value is different from the current value, a change event will also be emitted on the form context itself, updating all bindings for values and errors.
	 * @param name The name of the field to set
	 * @param value The new field value
	 */
	set(name?: string & keyof TSchema, value?: unknown) {
		if (!name) return this;

		// set and validate if needed
		if (this._values[name] !== value) {
			this._values[name] = value;
			if (this._reader && this._validated) {
				let [_, error] = this._reader.readField(this.values, name);
				if (error) this._errors[name] = error;
				else delete this._errors[name];
				this._valid = !Object.keys(this._errors).length;
			}
			this.emitFormChange();
		}
		return this;
	}

	/**
	 * Removes all field values and errors
	 * - After removing all fields, a change event is emitted on the form context object itself.
	 */
	clear() {
		this._values = Object.create(null);
		this._errors = Object.create(null);
		this._valid = true;
		this._validated = false;
		this.emitFormChange();
		return this;
	}

	/**
	 * Emits a `FormChange` change event on this object
	 * - This method is called automatically when setting form fields. Emitting a change event causes bindings for values and errors to be updated automatically.
	 */
	emitFormChange() {
		return this.emitChange("FormChange");
	}

	/**
	 * Validates the current form values according to the validation schema
	 * - This method returns the validated fields as a plain object, and also updates the {@link errors} and {@link valid} properties.
	 * - After this method has been called at least once, fields are checked automatically whenever a field is updated, maintaining the validation status in the {@link errors} and {@link valid} properties. To stop automatic validation until this method is called again, use the {@link clear()} method.
	 */
	validate() {
		let reader = this._reader;
		if (!reader) return;
		let wasValid = this._valid;
		let [result, errors] = reader.read(this.values);
		this._errors = errors;
		this._valid = !!result;
		this._validated = true;
		if (wasValid && !result) this.emitFormChange();
		if (result) return result;
	}

	private _reader?: ObjectReader<TSchema>;
	private _validated = false;
}

export namespace FormContext {
	/**
	 * Maintain the intrinsic value of a view based on its `formField` property and the closest (bound) `formContext` reference
	 *
	 * @summary This function is used by {@link UITextField} and {@link UIToggle} to keep their values in sync with a bound {@link FormContext}, if their `formField` property has been set. This function can also be used on custom views such as {@link UIComponent} instances, to support the use of {@link FormContext} to keep track of an intrinsic value.
	 *
	 * @note Do not call this function more than once for the same view instance. In most cases, it should be called only from the view constructor or `onBeforeRender` handler of a {@link UIComponent} object.
	 *
	 * @param host The view instance that contains a `formField` property
	 * @param setValue A function that's used to update the view's intrinsic value, called with the new value as a single parameter
	 * @param getValue A function that's used to get the view's intrinsic value, to update the form context after a 'Change' or 'Input' event has been emitted by the view.
	 */
	export function listen<THost extends View & { formField?: string }>(
		host: THost,
		setValue: (this: THost, value: any) => void,
		getValue: (this: THost) => any,
	) {
		let formContext: FormContext<any> | undefined;
		_boundFormContext.bindTo(host, (ctx) => {
			formContext = ctx;
			if (ctx && host.formField) {
				setValue.call(host, ctx.values[host.formField]);
			}
		});
		ObservedObject.observe(host, ["formField"], (host, _, value) => {
			if (
				formContext &&
				typeof value === "string" &&
				value in formContext.values
			) {
				setValue.call(host, (formContext.values as any)[value]);
			}
		});
		host.listen((event) => {
			if (event.name === "Change" || event.name === "Input") {
				if (formContext && host.formField) {
					let value = getValue.call(host);
					formContext.set(host.formField as any, value);
				}
			}
		});
	}

	const _boundFormContext = new Binding("formContext.*");
}
