import { InputValidator, StringConvertible } from "@talla-ui/util";
import { ObservableObject } from "../object/index.js";

/**
 * An object that contains form field data, with validation rules
 *
 * @description
 * The FormState class provides a data model for user input, allowing UI elements to read and write data from/to a single form state object — instead of having to use individual bindings and event handlers for each field.
 *
 * The form state object provides methods to get, set, and clear field values, as well as a way to validate current values according to a schema or custom validation functions. Form values and validation errors can be bound to any other view properties to be displayed in the UI.
 *
 * Validation is performed using an {@link InputValidator} instance. Errors must be added as strings or {@link StringConvertible} values (e.g. the result of {@link fmt()}) using the `required()` or `error()` methods of each field in the schema.
 *
 * To use a FormState object with {@link UITextField} or {@link UIToggle} input elements, use their `.bindFormState()` builder method.
 *
 * @example
 * function FormView(v: Binding<MyActivity>) {
 *   return UI.Column(
 *     UI.TextField().bindFormState(v.bind("form"), "foo"),
 *     UI.Label(v.bind("form.errors.foo.message"))
 *       .hideWhen(v.bind("form.errors.foo").not()),
 *     UI.Button("Go").emit("Submit")
 *   );
 * }
 *
 * class MyActivity extends Activity {
 *   static View = FormView;
 *
 *   form = new FormState((f) => f.object({
 *     foo: f.string().required("Foo is required")
 *   }));
 *
 *   onSubmit() {
 *     let values = this.form.validate();
 *     // now, values.foo is a string with length > 0,
 *     // OR otherwise
 *     // - values is undefined, and
 *     // - this.form.valid is false, and
 *     // - this.form.errors.foo is "Foo is required"
 *   }
 * }
 */
export class FormState<
	TSchema extends Record<string, unknown> = Record<string, unknown>,
> extends ObservableObject {
	/** Creates a new instance with the provided validation schema and/or values */
	constructor(
		fields?: InputValidator.Initializer<TSchema>,
		values?: Partial<Record<keyof TSchema, unknown>>,
	) {
		super();
		if (fields) this._validator = new InputValidator(fields);
		if (values) Object.assign(this._values, values);
	}

	/**
	 * An object that contains current form field values
	 * - Do not set field values here. Instead, use the {@link FormState.set()} method to update field values.
	 * - These values are not (necessarily) valid, and are typed as `unknown`. To validate form fields and get the result, use the {@link validate()} method.
	 * - Properties of this object can be bound, e.g. to display form fields elsewhere in the view.
	 * @readonly
	 */
	get values(): Readonly<Partial<Record<keyof TSchema, unknown>>> {
		return this._values as any;
	}
	private _values: Record<string, unknown> = Object.create(null);

	/**
	 * An object that contains validation error messages, if any
	 * - Errors are set by the {@link validate()} method. They are also set by the {@link set()} method, but only after {@link validate()} has been called at least once.
	 * - Errors (and values) can be cleared using the {@link clear()} method.
	 * @readonly
	 */
	get errors(): Readonly<{ [name in keyof TSchema]?: StringConvertible }> {
		return this._errors;
	}
	private _errors: { [name in keyof TSchema]?: StringConvertible } =
		Object.create(null);

	/**
	 * True if there are currently no recorded errors.
	 * - This field is updated by the {@link validate()} method. It is also updated by the {@link set()} method, but only after {@link validate()} has been called at least once. Before then, this field is always `true`.
	 * - This field is set back to `true` by the {@link clear()} method.
	 * @readonly
	 */
	get valid() {
		return this._valid;
	}
	private _valid = true;

	/**
	 * Sets the value of the specified form field
	 * @summary This method sets a form field to the provided value. If the {@link validate()} method has been called at least once (and {@link clear()} hasn't been called after that), the new field value is also checked against the validation schema, updating the {@link errors} and {@link valid} properties. If the new value is different from the current value, a change event will also be emitted on the form state itself, updating all bindings for values and errors.
	 * @param name The name of the field to set
	 * @param value The new field value
	 */
	set(name?: string & keyof TSchema, value?: unknown) {
		if (!name) return this;

		// set and validate if needed
		if (this._values[name] !== value) {
			this._values[name] = value;
			if (this._validated) this.validateField(name);
			this.emitChange();
		}
		return this;
	}

	/**
	 * Removes all field values and errors
	 * - After removing all fields, a change event is emitted on the form state object itself.
	 */
	clear() {
		this._values = Object.create(null);
		this._errors = Object.create(null);
		this._valid = true;
		this._validated = false;
		this.emitChange();
		return this;
	}

	/**
	 * Validates the current form values according to the validation schema
	 * - This method returns the validated fields as a plain object, and also updates the {@link errors} and {@link valid} properties.
	 * - After this method has been called at least once, fields are checked automatically whenever a field is updated, maintaining the validation status in the {@link errors} and {@link valid} properties. To stop automatic validation until this method is called again, use the {@link clear()} method.
	 */
	validate(): TSchema | undefined {
		let validator = this._validator;
		if (!validator) return;
		let wasValid = this._valid;
		let { data, errors } = validator.safeParse(this._values);
		this._errors = errors || Object.create(null);
		this._valid = !errors;
		this._validated = true;
		if (!wasValid || errors) this.emitChange();
		if (data) return data;
	}

	/**
	 * Validates a single form field
	 * - This method updates the {@link errors} property for the specified field, and also updates the {@link valid} property based on all (remaining) validation errors.
	 * - If the field has no validation schema, the method returns the field value unchanged.
	 * - This method does not emit a change event on the form state object. To update bindings for errors after calling this method on its own, call `emitChange()` yourself afterwards.
	 * @param name The name of the field to validate
	 * @returns The validated field value, or undefined if the field is not valid
	 */
	validateField(name: string & keyof TSchema): unknown {
		let value = this._values[name];
		let fieldSchema = this._validator?.schema?.shape?.[name];
		if (!fieldSchema) return value;

		let validator = new InputValidator(() => fieldSchema);
		let result = validator.safeParse(value);
		if (result.success) delete this._errors[name];
		else this._errors[name] = result.error;
		this._valid = !Object.keys(this._errors).length;
		return result.data;
	}

	private _validator?: InputValidator<any>;
	private _validated = false;
}
