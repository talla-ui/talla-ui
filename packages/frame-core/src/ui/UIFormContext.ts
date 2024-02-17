import { bound, ManagedObject, StringConvertible } from "../base/index.js";
import { AppException } from "../app/index.js";

/** Error that's used when a required property is missing */
const REQUIRED_ERROR = AppException.type(
	"FORM_REQUIRED",
	"This field is required",
);

/** @internal Binding for path "formContext" */
export const _boundFormContext = bound("formContext");

/**
 * An object that contains form field data along with validation tests
 *
 * @description
 * The UIFormContext class provides a data model for user input, allowing UI components to read and write data from/to a single form context object — instead of having to use individual bindings and event handlers for each field.
 *
 * The form context object provides methods to get, set, and clear field values, as well as methods to add validation tests and validate current field values. Form values and validation errors can be bound to any other view properties.
 *
 * The overall validity of the form context can be determined using the {@link UIFormContext.validateAll()} method and the {@link UIFormContext.valid valid} property.
 *
 * To use a UIFormContext object with {@link UITextField} or {@link UIToggle} components, set their `formField` property to a field name, and include them in a {@link UIForm} container or {@link UIFormController} view. These view objects both contain a `formContext` property, which is bound and used by the input components. Alternatively, add a `formContext` property directly to your activity (see examples).
 *
 * To use a UIFormContext object with any other (custom) view, add a `formContext` property binding and handle changes to obtain the current input value using the {@link UIFormContext.get()} method. When the user inputs a new value, use the {@link UIFormContext.set()} method to set and validate the value.
 *
 * @example
 * // Use form fields in a form
 * const FormView = UIForm.with(
 *   { formContext: bound("fooForm") },
 *   UITextField.with({ formField: "foo" }),
 *   UILabel.with({
 *     style: myStyles.errorLabel,
 *     hidden: bound.not("fooForm.errors.foo"),
 *     text: bound.string("fooForm.errors.foo.message")
 *   }),
 *   UIPrimaryButton.withLabel("Go", "Submit")
 * );
 *
 * class MyActivity extends Activity {
 *   protected ready() {
 *     this.view = new FormView();
 *   }
 *
 *   fooForm = new UIFormContext({ foo: "" })
 *     .addTest("foo", (t) => {
 *       t.required();
 *       t.assert(t.value.length > 3, strf("Foo is too short"));
 *     });
 *
 *   onSubmit() {
 *     this.fooForm.validateAll();
 *     // now, this.fooForm.valid is false if
 *     // the field 'foo' isn't set or too short
 *   }
 * }
 *
 * @example
 * // Use form fields with formContext on the activity
 * const MyView = UICell.with(
 *   UITextField.with({ formField: "foo" }),
 *   // ...
 * );
 *
 * class MyActivity extends Activity {
 *   protected ready() {
 *     this.view = new FormView();
 *   }
 *   formContext = new UIFormContext({ foo: "" });
 *   // ...
 * }
 */
export class UIFormContext<TData = any> extends ManagedObject {
	/** Creates a new instance with the provided (default) values */
	constructor(values?: TData) {
		super();
		if (values) this._values = values;
	}

	/**
	 * An object that contains current form field values
	 * - Properties of this object can be bound, e.g. to display form fields elsewhere in the view.
	 * - To set field values, use the {@link UIFormContext.set()} method.
	 * @readonly
	 */
	get values(): Readonly<Partial<TData>> {
		return this._values;
	}
	private _values: Partial<TData> = Object.create(null);

	/**
	 * An object that contains validation errors for fields that have been validated
	 * - Errors are only recorded when fields are set or validated explicitly. To force all fields to be validated and this object to contain errors for _all_ fields, use the {@link UIFormContext.validateAll()} method.
	 * @readonly
	 */
	get errors(): Readonly<{ [name in keyof TData]?: Error }> {
		return this._errors;
	}
	private _errors: { [name in keyof TData]?: Error } = Object.create(null);

	/**
	 * The number of errors that have been recorded after validation of one or more fields
	 * - Errors are only recorded when fields are set or validated explicitly. To force all fields to be validated and this value to contain the number of errors for _all_ fields, use the {@link UIFormContext.validateAll()} method.
	 * @readonly
	 */
	get errorCount() {
		let count = 0;
		for (let p in this._errors) {
			if (this._errors[p]) count++;
		}
		return count;
	}

	/**
	 * True if there are currently no recorded errors.
	 * - Errors are only recorded when fields are set or validated explicitly. To force all fields to be validated and this value to contain the number of errors for _all_ fields, use the {@link UIFormContext.validateAll()} method.
	 * @readonly
	 */
	get valid() {
		for (let p in this._errors) {
			if (this._errors[p]) return false;
		}
		return true;
	}

	/** Returns the value of the form field with the specified name */
	get<K extends keyof TData>(name: K): TData[K] | undefined {
		return this._values[name];
	}

	/**
	 * Sets the value of the form field with the specified name
	 * @summary This method sets a form field to the provided value. If the value is different from the current value of the form field, or if the validation result has changed, a change event will be emitted on the form context object itself.
	 *
	 * The field value may be converted to a different type if needed:
	 * - If the field was initialized with a number value, the value is converted to a number. If the result is NaN, the field value is set to undefined instead.
	 * - If the field was initialized with a boolean value, the value is set to true or false directly.
	 * @param name The name of the field to set
	 * @param value The new field value
	 * @param validate True if validation tests should be run for this field, if any
	 */
	set(name?: keyof TData, value?: any, validate?: boolean) {
		if (!name) return;

		// convert number and boolean values
		if (typeof this._values[name] === "number") {
			value = +value;
			if (isNaN(value)) value = undefined;
		} else if (typeof this._values[name] === "boolean") {
			value = !!value;
		}

		// set and validate
		if (this._values[name] !== value) {
			this._values[name] = value;
			if (validate) this.validate(name);
			this.emitFormChange();
		} else if (validate) {
			let hadError = !!this._errors[name];
			this.validate(name);
			let hasError = !!this._errors[name];
			if (hadError !== hasError) this.emitFormChange();
		}
		return this;
	}

	/**
	 * Sets multiple form fields using the provided values
	 * @summary This method uses the {@link set} method to set multiple form fields. Calling this method is equivalent to calling the {@link set} method once for each property of the provided object.
	 *
	 * @param values An object that contains field names as property names, and their corresponding values as property values
	 * @param validate True if validation tests should be run for all of the provided fields
	 */
	setAll(values?: Partial<TData>, validate?: boolean) {
		for (let name in values) {
			this.set(name, values[name], validate);
		}
		return this;
	}

	/**
	 * Removes the value for the form field with the specified name
	 * - This method also removes the error associated with the specified form field, if any.
	 * - After removing the field, a change event is emitted on the form context object itself.
	 */
	unset(name: keyof TData) {
		if (!name || !(name in this.values)) return;
		delete this._values[name];
		delete this._errors[name];
		this.emitFormChange();
		return this;
	}

	/**
	 * Removes all field values and errors
	 * - After removing all fields, a change event is emitted on the form context object itself.
	 */
	clear() {
		this._values = Object.create(null);
		for (let p in this._errors) delete this._errors[p];
		this.emitFormChange();
		return this;
	}

	/** Returns a plain object that contains properties for all fields and their values */
	serialize(): Partial<TData> {
		return Object.assign(Object.create(null), this.values);
	}

	/**
	 * Emits a `FormChange` change event on this object
	 * - This method is called automatically when setting or removing form fields. After emitting a change event, existing bindings for values or errors should be updated automatically.
	 */
	emitFormChange() {
		this.emitChange("FormChange");
	}

	/**
	 * Adds a validation test for the specified field
	 *
	 * @summary This method adds a test function to be run each time the form field is changed, or whenever validation is requested explicitly.
	 *
	 * The function should accept a single argument, an instance of {@link UIFormContext.ValidationTest}, and either return normally or throw an Error. The methods of the provided ValidationTest object can be used to throw relevant errors; otherwise the function may throw any Error instance, such as an {@link AppException} object.
	 *
	 * @example
	 * // Add a test to verify phone number input
	 * let myFormContext = new UIFormContext({ phone: "" })
	 *   .addTest("phone", (t) => {
	 *     t.required("Phone number is required"); // throws if empty
	 *     t.assert(/^[-+\d ]{8,}$/.test(t.value!),
	 *       "Invalid phone number"); // throws if no regex match
	 *   })
	 */
	addTest<K extends keyof TData>(
		name: K,
		f: (test: UIFormContext.ValidationTest<TData[K]>) => void,
	) {
		this._tests[name] = f;
		return this;
	}

	/** Adds a validation test for the specified field, which results in an error if the field is null, undefined, false, or an empty string */
	addRequired(name: keyof TData, errorMessage?: StringConvertible) {
		this.addTest(name, (t) => t.required(errorMessage));
		return this;
	}

	/**
	 * Validates the current value of the specified form field
	 * - This method uses validation tests added using {@link UIFormContext.addTest addTest()} or {@link UIFormContext.addRequired addRequired()}. The corresponding property of the {@link UIFormContext.errors} object is updated after running the validation test.
	 * - This method **never** throws an error itself.
	 */
	validate(name: keyof TData) {
		let value = this.values[name];
		if (this._tests[name]) {
			try {
				let test = new UIFormContext.ValidationTest<any>(name as string, value);
				this._tests[name](test);
				delete this._errors[name];
			} catch (err: any) {
				this._errors[name] = err;
			}
		} else {
			delete this._errors[name];
		}
		return !this._errors[name];
	}

	/**
	 * Runs all validation tests and updates the {@link UIFormContext.errors errors} object
	 * - This method uses validation tests added using {@link UIFormContext.addTest addTest()} or {@link UIFormContext.addRequired addRequired()}. The corresponding properties of the {@link UIFormContext.errors} object are updated after running all validation tests.
	 * - After validation, a change event is emitted on the form context object itself, unless there were no errors before and there are still no errors.
	 * - This method **never** throws an error itself.
	 */
	validateAll() {
		let hadErrors = !!this.errorCount;
		for (let p in this._tests) this.validate(p);
		if (hadErrors || this.errorCount) this.emitFormChange();
		return this;
	}

	private _tests: {
		[name in keyof TData]: (
			test: UIFormContext.ValidationTest<TData[name]>,
		) => void;
	} = Object.create(null);
}

export namespace UIFormContext {
	/**
	 * A class that represents a form validation test, passed to a form validation function
	 * @hideconstructor
	 */
	export class ValidationTest<TValue> {
		/**
		 * Creates a new test case
		 * - This constructor is called automatically when validating a particular form field
		 */
		constructor(name: string, value?: TValue) {
			this.name = name;
			this.value = value;
		}

		/** The name of the form field being validated */
		readonly name: string;

		/** The current form field value to be validated */
		readonly value?: TValue;

		/**
		 * Throws an error when the current value is undefined, null, false, or an empty string
		 * @param errorMessage An optional error message to be used if the validation fails, otherwise the default error message is used
		 * @error This method throws an error if the validation fails
		 */
		required(errorMessage?: StringConvertible) {
			if ((this.value as any) !== 0 && !this.value) {
				let ErrorType = errorMessage
					? AppException.type("FORM_REQUIRED", errorMessage)
					: REQUIRED_ERROR;
				throw new ErrorType();
			}
			return this;
		}

		/**
		 * Throws an error if the specified condition is false
		 * @param condition True for successful validation, false if the validation failed
		 * @param errorMessage The error message to be used; this string is used with {@link AppException} so that it can be localized using {@link GlobalContext.i18n app.i18n}.
		 * @error This method throws an error if the validation fails
		 */
		assert(condition: any, errorMessage: StringConvertible) {
			if (!condition) {
				let ErrorType = AppException.type("FORM_VALIDATION", errorMessage);
				throw new ErrorType(this.value as any);
			}
			return this;
		}
	}
}
