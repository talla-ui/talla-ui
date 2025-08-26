import { DeferredString, fmt, StringConvertible } from "@talla-ui/util";
import { AppContext } from "../app/index.js";
import { invalidArgErr } from "../errors.js";
import { ObservableObject } from "./ObservableObject.js";
import { $_bind_apply, watchBinding } from "./object_util.js";

/** Constant used to check against (new) binding value */
const NO_VALUE = {};

/** Method used for duck typing property */
const _isBinding = function (): true {
	return true;
};

/** @internal Checks if the provided value is an instance of {@link Binding}; uses duck typing for performance */
export function isBinding<T = any>(value: any): value is Binding<T> {
	return !!(value && (value as Binding).isBinding === _isBinding);
}

/**
 * A type that maps to the specified type _or_ a {@link Binding} instance
 * - This type can be used in object types or function arguments, to allow both a direct value and a binding.
 */
export type BindingOrValue<T> = T | { [BindingOrValue.TYPE_CHECK]: () => T };
export namespace BindingOrValue {
	/** A symbol that's used for type checking only */
	export const TYPE_CHECK = Symbol();
}

/**
 * A class that represents a property binding
 *
 * @description
 * A binding connects an object (an instance of {@link ObservableObject}) with one of the properties of one of its _containing_ (attached) objects. Bindings can be used to update properties on the target object, keeping the bound property in sync with the original property.
 *
 * For example, given an object `A` with property `p`, a binding can be used on an attached object `B` to update target property `q`. When the value of `p` changes, the same value is set on `q` immediately. This is considered a one-way data binding, since direct updates on property `q` don't affect the source property `p` at all.
 *
 * To make bindings work across a chain — or technically, a tree structure — of attached objects, bindings keep track of object attachments _to_ the target object (i.e. object B) all the way up the chain, to find a matching source property. Therefore, a binding on `C`, itself attached from `B`, may _also_ read property values from `A`.
 *
 * Instead of a single source property, bindings can also specify a source property 'path' using dots to separate property names: a path of `p.foo.bar` first watches `p`, then (if `p` refers to an object) its property `foo`, and so on — going first _up_ the tree structure to find the object containing `p`, and then down again to find the rest.
 *
 * As a concrete example, a binding can be used to update the `text` property of a {@link UILabel} view, with the value of a string property `labelText` of the activity. Or perhaps the property `name` of a `user` object referenced by the activity (see example below). Whenever the data in the activity changes, so does the label text.
 *
 * **Creating bindings** — To create a binding, use the {@link bind()} function to bind a single property (number, string, (negated) boolean, list), or use the {@link bind.fmt()} function to bind a string composed using a format string and one or more embedded bindings.
 *
 * **Binding to observable lists** — {@link ObservableList} instances include special properties that may be referenced by a binding path. Use `.length` to bind to the list length, `.#first` and `.#last` to bind to the first and last item in the list, respectively.
 *
 * **Applying bindings** — To add a binding to a View instance, pass the result of {@link bind()} to `UI` view builder functions, e.g. `UI.Label(bind("labelText"))`. To apply a binding to any other observable object directly, use the {@link ObservableObject.observe()} method.
 *
 * **Adding transformations** — To convert the value of the original property, or to combine multiple bindings using boolean operations (and/or), use one of the Binding methods such as {@link Binding.map map()} and {@link Binding.or or()}.
 *
 * @see {@link StringFormatBinding}
 * @see {@link bind}
 */
export class Binding<T = any> {
	/**
	 * Creates a new binding for given property and default value; use {@link bind()} functions instead
	 * @note Use the {@link bind} function to create {@link Binding} objects rather than calling this constructor.
	 * @param source The source path that's used for obtaining the bound value, another {@link Binding} to clone from, or an object with advanced options
	 * @param defaultValue An optional default value that's used when the bound value is undefined
	 */
	constructor(source?: string | Binding | Binding.Options, defaultValue?: T) {
		if (isBinding(source)) {
			this._path = source._path;
			this._prefix = source._prefix;
			this._type = source._type;
			this[$_bind_apply] = source[$_bind_apply];
			return;
		}

		// initialize path and other properties
		if (source && typeof source !== "string") {
			if (!Array.isArray(source.path)) throw invalidArgErr("source");
			defaultValue = source.default;
			this._type = source.type;
			this._path = [...source.path];
			if (source.prefix?.length) {
				this._path.unshift(...(this._prefix = source.prefix));
			}
		} else {
			this._path = source ? source.split(".") : [];
		}

		// set basic apply method (function bound to this instance)
		this[$_bind_apply] = !source
			? function () {}
			: function (target, update) {
					watchBinding(target, this._type, this._path, (value, bound) =>
						update(value ?? defaultValue, bound),
					);
				};
	}

	/** Binding source path */
	private readonly _path: string[];

	/** A list of properties that were prepended before the binding path (used when creating associated bindings from another path) */
	private readonly _prefix?: ReadonlyArray<string>;

	/** Source type to which bindings should be limited, if specified (otherwise base type is inferred) */
	private _type?: Function;

	/**
	 * Creates a new binding, which only binds on properties of a class with limited bindings
	 * - Use this method to create bindings that should only bind on properties of a specific class, which itself has enabled bindings only for its own type (using the {@link ObservableObject.enableBindings} method). Typically, this is used for custom views with content, and properties that may otherwise mask attached parent properties (e.g. on the activity).
	 * @param type The type to which the binding should be limited
	 * @returns A new binding, with the restriction applied
	 * @see {@link ObservableObject.enableBindings}
	 */
	onType(type: Function) {
		let result = this.clone();
		result._type = type;
		return result;
	}

	/**
	 * Creates a copy of this binding
	 * - This method is primarily used to be able to copy both plain bindings and string formatted bindings using the same method.
	 * @returns A new binding, with the same source path and type
	 */
	protected clone() {
		return new Binding(this);
	}

	/**
	 * Transforms the bound value to a string
	 * @param format A {@link fmt} format string to format the value, e.g. `Value: {}`, `{:.2f}`
	 * @returns A new binding, typed as a string
	 */
	asString(format?: string): Binding<string> {
		return this.map((value) =>
			format ? fmt(format, value).toString() : String(value ?? ""),
		);
	}

	/**
	 * Transforms the bound value to a boolean, and negates it
	 * @returns A new binding, typed as a boolean
	 */
	not(): Binding<boolean> {
		return this.map((value) => !value);
	}

	/**
	 * Transforms the bound value, using the provided function
	 * @param f A function that maps the bound value to a new value
	 * @returns A new binding, typed as the new value
	 */
	map<U>(f: (value: T) => U): Binding<U> {
		let result: Binding<U> = this.clone();
		let _apply = this[$_bind_apply];
		result[$_bind_apply] = function (target, update) {
			_apply.call(this, target, (value, bound) => update(f(value), bound));
		};
		return result;
	}

	/**
	 * Transforms the bound value to either one of the specified values (or undefined)
	 * @summary This method can be used to substitute the bound value with one of the specified values, depending on whether the bound value is equal to true according to the `==` operator.
	 * @param trueValue The value to use if the bound value is equal to true
	 * @param falseValue The value to use if the bound value is equal to false
	 * @returns A new binding, typed as the new value or undefined
	 */
	then<U, V>(trueValue: U, falseValue: V): Binding<U | V>;
	then<U>(trueValue: U): Binding<U | undefined>;
	then(trueValue: unknown, falseValue?: unknown): Binding<any> {
		return this.map((v) => (v ? trueValue : falseValue));
	}

	/**
	 * Transforms the bound value to the specified value, if the bound value is equal to false
	 * @summary This method can be used to substitute the bound value with a value, if the bound value is equal to false according to the `==` operator.
	 * @param falseValue The value to use if the bound value is equal to false
	 * @returns A new binding, typed as the new value
	 */
	else<U>(falseValue: U): Binding<T | U> {
		return this.map((v) => v || falseValue);
	}

	/**
	 * Transforms to a boolean, true if the bound value exactly equals a literal value
	 * @param value The literal value to compare with
	 * @returns A new binding, typed as a boolean
	 */
	equals(value: T): Binding<boolean> {
		return this.map((v) => v === value);
	}

	/** @internal Typo/hallucination alias */
	eq(v: any) {
		return this.equals(v);
	}

	/**
	 * Transforms to a boolean, true if the bound value is less than a literal value
	 * @param value The literal value to compare with
	 * @returns A new binding, typed as a boolean
	 */
	lt(value: number): Binding<boolean> {
		return this.map((v) => +v < value);
	}

	/**
	 * Transforms to a boolean, true if the bound value is greater than a literal value
	 * @param value The literal value to compare with
	 * @returns A new binding, typed as a boolean
	 */
	gt(value: number): Binding<boolean> {
		return this.map((v) => +v > value);
	}

	/**
	 * Transforms to a boolean, true if the bound value exactly equals another bound value
	 *
	 * @summary This method can be used to compare two bindings. If the original value matches the value of the provided binding, the bound value becomes true, otherwise false.
	 *
	 * To do the opposite, and substitute with false if the bindings match, use the {@link Binding.not not()} method afterwards.
	 *
	 * @param source Another instance of {@link Binding}, or a source path that will be passed to {@link bind()}
	 * @returns A new binding, typed as a boolean
	 *
	 * @example
	 * // A cell that's rendered only if two bindings match
	 * UI.ShowWhen(bind("item").matches("selectedItem"), UI.Cell(
	 *   // ...
	 * ))
	 */
	matches(source: Binding | string): Binding<boolean> {
		return this._addBool(source, false, true) as any;
	}

	/**
	 * Transforms the bound value and another binding, applying the `&&` operator
	 *
	 * @summary This method can be used to combine two bindings logically, using the `&&` operator. The resulting bound value is the value of the _other_ binding, if the current bound value is equal to true (according to the `==` operator). The result is the value of the current binding, if its value is equal to false.
	 *
	 * @param source Another instance of {@link Binding}, or a source path that will be passed to {@link bind()}
	 * @returns A new binding, typed as a union of both original types
	 *
	 * @example
	 * // A simple boolean AND
	 * bind("itemFound").and("hasPrice")
	 *
	 * // A conditional string binding
	 * bind("showCustomer")
	 *   .and(bind.fmt("Customer: {}", bind("customer.name")))
	 */
	and<U = any>(source: Binding<U> | string): Binding<T | U> {
		return this._addBool(source, true) as any;
	}

	/**
	 * Transforms the bound value and another binding, applying the `||` operator
	 *
	 * @summary This method can be used to combine two bindings logically, using the `||` operator. The resulting bound value is the value of the _other_ binding, if the current bound value is equal to false (according to the `==` operator). The result is the value of the current binding, if its value is equal to true.
	 *
	 * @param source Another instance of {@link Binding}, or a source path that will be passed to {@link bind()}
	 * @returns A new binding, typed as a union of both original types
	 *
	 * @example
	 * // A simple boolean OR
	 * bind("itemFound").or("hasDefault")
	 *
	 * // A conditional string binding
	 * bind("customer.name")
	 *   .or(bind.fmt("Default: {}", "defaultCustomer.name"))
	 */
	or<U = any>(source: Binding<U> | string): Binding<T | U> {
		return this._addBool(source) as any;
	}

	/**
	 * Logs a debug message whenever the bound value changes.
	 * @returns The binding itself, with debug events enabled
	 */
	debug() {
		let _apply = this[$_bind_apply];
		this[$_bind_apply] = function (target, update) {
			let hasValue: boolean | undefined;
			_apply.call(this, target, (value, bound) => {
				hasValue = true;
				AppContext.getInstance().log.debug(
					this.toString() + (bound ? " =>" : " [not bound]"),
					value,
				);
				update(value, bound);
			});
			setTimeout(() => {
				if (!hasValue) {
					AppContext.getInstance().log.debug(this.toString() + " [not bound]");
				}
			}, 1);
		};
		return this;
	}

	/**
	 * Returns a description of this binding, including its original source path, if any.
	 * @returns The string description.
	 */
	toString() {
		return "bind(" + this._path.join(".") + ")";
	}

	/**
	 * A method that's used for duck typing, always returns true
	 * @docgen {hide}
	 */
	declare isBinding: () => true; // set on prototype

	/**
	 * A method that's used for type checking, doesn't actually exist
	 * @docgen {hide}
	 */
	declare [BindingOrValue.TYPE_CHECK]: () => T;

	/** @internal Apply this binding to an observable object using given update callback; cascades down to child bindings (for boolean logic and string bindings) */
	[$_bind_apply]: (
		this: Binding<any>,
		target: ObservableObject,
		update: (value: any, bound: boolean) => void,
	) => void;

	/** Implementation for `.and()`, `.or()`, and `.matches()` */
	private _addBool(
		other: string | Binding,
		isAnd?: boolean,
		isMatch?: boolean,
	) {
		// create other binding (if needed)
		if (!isBinding(other)) {
			other = new Binding({
				path: other.split("."),
				type: this._type,
				prefix: this._prefix,
			});
		}

		// update apply method to also apply other binding
		let result = this.clone();
		let _apply = this[$_bind_apply];
		result[$_bind_apply] = function (target, update) {
			let currentValue = NO_VALUE;

			// keep track of status, only update when both values known
			let flags = 3;
			function set(v1: any, v2: any, noUpdate: any, bound: boolean) {
				if (noUpdate) return;
				let newValue = isMatch ? v1 === v2 : isAnd ? v1 && v2 : v1 || v2;
				if (newValue !== currentValue) {
					currentValue = newValue;
					update(newValue, bound);
				}
			}

			// keep track of both values at the same time
			let value1: any = undefined;
			let value2: any = undefined;
			_apply.call(this, target, (value, bound) =>
				set((value1 = value), value2, (flags &= 2), bound),
			);
			other[$_bind_apply].call(other, target, (value, bound) =>
				set(value1, (value2 = value), (flags &= 1), bound),
			);
		};
		return result;
	}
}

Binding.prototype.isBinding = _isBinding;

/**
 * A class that represents a string-formatted binding with nested property bindings
 *
 * @description
 * String-formatted bindings use a 'format string' that contains one or more placeholders, along with a set of associated (nested) bindings. They can be used just like regular property bindings (see {@link Binding}).
 *
 * After binding to an object, the underlying string value is updated whenever any of the nested bindings change — inserting the bound values into the string.
 *
 * Instances of this class can be created using the {@link bind.fmt} function.
 *
 * @example
 * // String-formatted bindings with positional arguments
 * bind.fmt("Today is {}", bind("dayOfTheWeek"))
 * bind.fmt("{} table {0:+/row/rows}, total {}", bind("rows.length"), bind("calcTotal"))
 *
 * @example
 * // String-formatted binding with object argument
 * bind.fmt(
 *   "{user} is {age} years old",
 *   {
 *     user: bind("user.name", fmt("Unknown user")),
 *     age: bind("user.age").map((age) => age ?? 99)
 *   }
 * )
 *
 * @example
 * // A label with bound text
 * UI.Label(bind.fmt("Welcome, {}", bind("user.fullName")))
 */
export class StringFormatBinding extends Binding<DeferredString> {
	/**
	 * Creates a new string-formatted binding using; use {@link bind.fmt()} instead
	 * @note Use the {@link bind.fmt()} function to create {@link StringFormatBinding} objects rather than calling this constructor.
	 * @param format The format string, containing placeholders similar to {@link fmt()}
	 * @param args A list of associated bindings
	 */
	constructor(
		format: StringConvertible,
		...args: Binding[] | [{ [K: string]: Binding }]
	) {
		super(undefined);
		this._format = format;
		if (!format) return;
		this._makeApply(format, args);
	}

	/** Returns a description of this binding, including its original format string. */
	override toString() {
		return "bind.fmt(" + JSON.stringify(this._format) + ")";
	}

	protected override clone(): StringFormatBinding {
		let result = new StringFormatBinding("");
		result._format = this._format;
		result[$_bind_apply] = this[$_bind_apply];
		return result;
	}

	/** Set the _apply method to update the bound string value */
	private _makeApply(
		format: StringConvertible,
		args: Binding[] | [{ [K: string]: Binding }],
	) {
		let base = new DeferredString(format);
		let obj = !isBinding(args[0]) ? args[0] : undefined;
		if (obj) args = [];

		// use shortcut if no interpolation arguments at all
		if (!obj && !args.length) {
			this[$_bind_apply] = (_, update) => update(base, false);
			return;
		}

		// otherwise, use DeferredString.format whenever bindings are updated
		this[$_bind_apply] = (target, update) => {
			// keep track of all bound interpolation arguments
			let values: any[] = [];
			let nBindings = 0;
			let n = 0;

			// register all nested bindings, update when values change
			function updateString() {
				if (n >= nBindings) {
					let newValue = base.format(...values);
					update(newValue, true);
				}
			}
			for (let i = 0; i < args.length; i++) {
				let binding = args[i];
				if (isBinding(binding)) {
					nBindings++;
					binding[$_bind_apply](target, (value) => {
						n++;
						if (!(i in values) || values[i] !== value) {
							values[i] = value;
							updateString();
						}
					});
				}
			}
			if (obj) {
				let valueObj: any = (values[0] = {});
				for (let p in obj) {
					if (isBinding(obj[p])) {
						nBindings++;
						obj[p]![$_bind_apply](target, (value: any) => {
							n++;
							if (!(p in valueObj) || valueObj[p] !== value) {
								valueObj[p] = value;
								updateString();
							}
						});
					}
				}
			}
		};
	}

	private _format: StringConvertible;
}

export namespace Binding {
	/**
	 * Options that can be passed to the {@link Binding} constructor, used by {@link bind} and other binding factories
	 */
	export type Options = {
		/** The source property path, as an array */
		readonly path: string[];
		/** Default value, used when the bound value itself is undefined */
		readonly default?: any;
		/** The parent object type to observe, if specified (otherwise base type is inferred) */
		readonly type?: Function;
		/** An optional list of property names that are prepended before all binding paths */
		readonly prefix?: ReadonlyArray<string>;
	};
}

/**
 * Creates a new binding for a specific property or source path
 * @summary This function is used to create a new binding for a specific source path, with an optional default value.
 * @param sourcePath The source (property) path that's used for obtaining the bound value
 * @param defaultValue An optional default value that's used when the bound value is undefined
 * @returns A {@link Binding} object
 * @see {@link Binding}
 */
export function bind<T = any>(sourcePath: string, defaultValue?: any) {
	if (defaultValue === undefined && _cache.has(sourcePath)) {
		return _cache.get(sourcePath)!;
	}
	return new Binding<T>(sourcePath, defaultValue);
}

/** @internal Cache of bindings, to avoid creating new instances for the same source path */
const _cache = new Map<string, Binding>();

export namespace bind {
	/**
	 * Creates a new binding, negating the original binding
	 * @summary This function is used to create a new binding that is the boolean opposite (i.e. `!`) of the original binding.
	 * @param source The source (property) path that's used for obtaining the bound value
	 * @returns A new {@link Binding} object
	 */
	export function not(source: string) {
		return bind(source).not();
	}

	/**
	 * Creates a new binding, resulting in the first non-false value out of multiple bindings
	 * - This function repeatedly calls {@link Binding.or} for each source and returns the resulting binding.
	 * @param sources One or more instances of {@link Binding} or source paths that will be passed to {@link bind()}
	 */
	export function either<T>(
		...sources: Array<string | Binding<T>>
	): Binding<T> {
		let result = new Binding(sources.shift());
		while (sources.length) {
			result = result.or(sources.shift()!);
		}
		return result;
	}

	/**
	 * Creates a new binding, resulting in true if none of the specified bindings are true
	 * - This function repeatedly calls {@link Binding.or} for each source and returns the negated resulting binding (using {@link Binding.not}).
	 * @param sources One or more instances of {@link Binding} or source paths that will be passed to {@link bind()}
	 */
	export function neither(...sources: Array<string | Binding>) {
		return either(...sources).not();
	}

	/**
	 * Creates a new binding for a string-formatted value
	 * @summary This function is used to create a new binding for a string-formatted value with further embedded bindings.
	 * @param format The format string, containing placeholders similar to {@link fmt()}
	 * @param args A list of associated bindings
	 * @returns A new {@link StringFormatBinding} object
	 * @see {@link StringFormatBinding}
	 */
	export function fmt(
		format: StringConvertible,
		...args: Binding[] | [{ [K: string]: Binding }]
	) {
		return new StringFormatBinding(format, ...args);
	}
}
