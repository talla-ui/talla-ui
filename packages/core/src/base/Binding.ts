import { invalidArgErr } from "../errors.js";
import { LazyString } from "./LazyString.js";
import { ManagedObject } from "./ManagedObject.js";
import { $_unlinked, watchBinding } from "./object_util.js";

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
 * A binding connects an object (an instance of {@link ManagedObject}) with one of the properties of one of its _containing_ (attached) objects. Bindings can be used to update properties on the target object, keeping the bound property in sync with the original property.
 *
 * For example, given an object `A` with property `p`, a binding can be used on an attached object `B` to update target property `q`. When the value of `p` changes, the same value is set on `q` immediately. This is considered a one-way data binding, since direct updates on property `q` don't affect the source property `p` at all.
 *
 * To make bindings work across a chain — or technically, a tree structure — of attached objects, bindings keep track of object attachments _to_ the target object (i.e. object B) all the way up the chain, to find a matching source property. Therefore, a binding on `C`, itself attached from `B`, may _also_ read property values from `A`.
 *
 * Instead of a single source property, bindings can also specify a source property 'path' using dots to separate property names: a path of `p.foo.bar` first watches `p`, then (if `p` refers to an object) its property `foo`, and so on — going first _up_ the tree structure to find the object containing `p`, and then down again to find the rest.
 *
 * As a concrete example, a binding can be used to update the `text` property of a {@link UILabel} view, with the value of a string property `labelText` of the activity. Or perhaps the property `name` of a `user` object referenced by the activity (see example below). Whenever the data in the activity changes, so does the label text.
 *
 * **Creating bindings** — To create a binding, use the {@link $bind()} function, or one of the functions of e.g. {@link $activity} and {@link $view} to bind a number, string, (negated) boolean, list, or a string composed using a format string and one or more embedded bindings, e.g. `$bind("anyValue")`, `$bind.not("showList")`, `$activity.string("labelText")`, or `$strf("Value: %i", $activity.number("lines.count"))`.
 *
 * **Binding to managed lists** — {@link ManagedList} instances include special properties that may be referenced by a binding path. Use `.count` to bind to the list count, `.#first` and `.#last` to bind to the first and last item in the list, respectively.
 *
 * **Applying bindings** — Include the result of {@link $bind()} in the preset object or parameters passed to {@link ui} factory functions (or JSX attributes), to add a bound property to a view, e.g. `ui.label($activity.string("labelText"))` or `<textfield placeholder={$view.string("placeholderText")} />`.
 *
 * To apply a binding to any other managed object, use to the {@link bindTo()} method. This method can be used to bind a target property, or to call a function whenever the source value changes.
 *
 * **Adding filters** — To convert the value of the original property, or to combine multiple bindings using boolean operations (and/or), use one of the Binding methods such as {@link Binding.and and()}, {@link Binding.select select()}, or {@link Binding.matches matches()}.
 *
 * @see {@link StringFormatBinding}
 * @see {@link $bind}
 */
export class Binding<T = any> {
	/** @internal Logs a binding debug message; set when app context is created */
	static log_debug?: (message: string, data?: unknown) => void;

	/**
	 * Creates a new binding for given property and default value; use {@link $bind()} functions instead
	 * @note Use the {@link $bind} function to create {@link Binding} objects rather than calling this constructor.
	 * @param source The source path that's used for obtaining the bound value, another {@link Binding} to clone from, or an object with advanced options
	 * @param defaultValue An optional default value that's used when the bound value is undefined
	 */
	constructor(source?: string | Binding | Binding.Options, defaultValue?: T) {
		if (isBinding(source)) {
			this._path = source._path;
			this._prefix = source._prefix;
			this._label = source._label;
			this._apply = source._apply;
			return;
		}

		// initialize path and other properties
		if (source && typeof source !== "string") {
			if (!Array.isArray(source.path)) throw invalidArgErr("source");
			defaultValue = source.default;
			this._label = source.label;
			this._path = [...source.path];
			if (source.prefix?.length) {
				this._path.unshift(...(this._prefix = source.prefix));
			}
		} else {
			this._path = source ? source.split(".") : [];
		}

		// set basic apply method (function bound to this instance)
		this._apply = !source
			? function () {}
			: (target, update) =>
					watchBinding(target, this._label, this._path, (value, bound) =>
						update(value ?? defaultValue, bound),
					);
	}

	/** Binding source path */
	private readonly _path: string[];

	/** Property to filter source origin objects, i.e. only consider objects that include this property */
	private readonly _label?: string | symbol;

	/** A list of properties that were prepended before the binding path (used when creating associated bindings from another path) */
	private readonly _prefix?: ReadonlyArray<string>;

	/**
	 * Applies this binding to the specified target object
	 * - This method should only be used once for each target, preferably from a constructor, since each call sets up a listener to watch the target again.
	 * - The same binding can be applied multiple times (e.g. to different instances of an activity), removing the need to create a new {@link Binding} instance each time.
	 * @param target The target (attached) object
	 * @param propertyOrFunction The property to update, or a custom function to handle value updates
	 */
	bindTo<TObject extends ManagedObject>(
		target: TObject,
		propertyOrFunction: keyof TObject | ((value?: T, bound?: boolean) => void),
	) {
		if (target[$_unlinked]) return;

		if (typeof propertyOrFunction !== "function") {
			let p = propertyOrFunction;
			propertyOrFunction = function setBoundProperty(v: any) {
				(target as any)[p] = v;
			};

			// create property if it doesn't exist yet
			if (!(p in target)) target[p] = undefined as any;
		}
		this._apply(target, propertyOrFunction);
	}

	/**
	 * Adds a filter, to convert the bound value to a string.
	 * @param format A {@link strf} format placeholder (without `%` character) to format the value, e.g. `n`, `.2f`, `lc`
	 * @returns A new binding, typed as a string
	 */
	asString(format?: string): Binding<string> {
		return this._filter((value) =>
			format ? LazyString.formatValue(format, value) : String(value ?? ""),
		);
	}

	/**
	 * Adds a filter, to convert the bound value to a number.
	 * @returns A new binding, typed as a number
	 */
	asNumber(): Binding<number> {
		return this._filter((value) => +value);
	}

	/**
	 * Adds a filter, to make sure that the bound value is an iterable list
	 * - This method allows arrays, Maps, ManagedList instances, and any other object that includes Symbol.iterator.
	 * - Other values are changed to undefined.
	 * @returns A new binding, typed as an Iterable object
	 */
	asList<T = any>(): Binding<Iterable<T>> {
		return this._filter<any>((value) =>
			value && typeof value === "object" && Symbol.iterator in value
				? value
				: undefined,
		);
	}

	/**
	 * Adds a filter, to convert the bound value to a boolean.
	 * @returns A new binding, typed as a boolean
	 */
	asBoolean(): Binding<boolean> {
		return this._filter((value) => !!value);
	}

	/**
	 * Adds a filter, to convert the bound value to a boolean, and negate it.
	 * @returns A new binding, typed as a boolean
	 */
	not(): Binding<boolean> {
		return this._filter((value) => !value);
	}

	/**
	 * Adds a filter, to use the current I18n provider to localize the bound value
	 * - The provided type is passed directly to the I18n provider. Commonly used types include `date` (with an additional `long` or `short` argument), and `currency` (with an optional currency symbol argument).
	 *
	 * @param type Argument(s) passed to {@link I18nProvider.format()}
	 * @returns A new binding, typed as a string
	 *
	 * @example
	 * // A label that shows a short last-modified date
	 * ui.label(
	 *   $bind("lastModified").local("date", "short")
	 * )
	 */
	local(...type: string[]): Binding<string> {
		return this._filter((value) => LazyString.local(value, ...type));
	}

	/**
	 * Adds a filter, to use one of the provided values instead of the bound value
	 *
	 * @summary This method can be used to substitute the bound value with a fixed value. If the bound value is equal to true (according to the `==` operator), the value is replaced with the provided `trueValue`. Otherwise, the value is replaced with the provided `falseValue`, e.g. for bound undefined, null, false, zero, and empty string values. If `falseValue` isn't provided, undefined is used.
	 *
	 * @param trueValue The value to be used if the bound value is equal to true
	 * @param falseValue The value to be used if the bound value is equal to false
	 * @returns A new binding, typed like both of the given values
	 *
	 * @example
	 * // A label that displays (localized) Yes or No
	 * // depending on a property value
	 * ui.label(
	 *   $bind("isEnabled").select(strf("Yes"), strf("No"))
	 * )
	 */
	select<U, V>(trueValue: U, falseValue?: V): Binding<U | V> {
		return this._filter((value) => (value ? trueValue : falseValue));
	}

	/**
	 * Adds a filter, to use the provided value instead of a bound value that's equal to false
	 *
	 * @summary This method can be used to substitute the bound value with a fixed value, if the bound value is equal to false (according to the `==` operator), e.g. for bound undefined, null, false, zero, and empty string values.
	 * @note Alternatively, use the `defaultValue` argument to the {@link $bind()} function to specify a default value that's used if the bound value is undefined.
	 *
	 * @param falseValue The value to be used if the bound value is equal to false
	 * @returns A new binding, typed like the given value
	 *
	 * @example
	 * // A label that displays a value OR (localized) "None"
	 * ui.label(
	 *   $bind("customer.name").else(strf("None"))
	 * )
	 */
	else<U>(falseValue: U): Binding<T | U> {
		return this._filter((value) => (value || falseValue) as any);
	}

	/**
	 * Adds a filter, to compare the bound value and replace it with true or false
	 *
	 * @summary This method can be used to substitute the bound value with true or false. If the original value matches at least one of the provided values, it's replaced with true; otherwise with false.
	 *
	 * To do the opposite, and substitute with false if any of the provided values match, use the {@link Binding.not not()} method afterwards (see example).
	 *
	 * @param values A list of values to compare the bound value to
	 * @returns A new binding, typed as a boolean
	 *
	 * @example
	 * // A cell that's rendered only if a string matches
	 * ui.conditional(
	 *   { state: $activity("tab").matches("contacts") },
	 *   ui.cell(
	 *     // ...
	 *   )
	 * )
	 *
	 * @example
	 * // A cell that's hidden if a string doesn't match
	 * ui.cell(
	 *   { hidden: $activity("tab").matches("contacts").not() },
	 *   // ...
	 * )
	 */
	matches(...values: any[]): Binding<boolean> {
		return this._filter((value) => values.some((a) => a === value));
	}

	/**
	 * Adds a filter, to compare the bound value with another bound value
	 *
	 * @summary This method can be used to compare two bindings. If the original value matches the value of the provided binding, the bound value becomes true, otherwise false.
	 *
	 * To do the opposite, and substitute with false if the bindings match, use the {@link Binding.not not()} method afterwards.
	 *
	 * @param source Another instance of {@link Binding}, or a source path that will be passed to {@link $bind()}
	 * @returns A new binding, typed as a boolean
	 *
	 * @example
	 * // A cell that's rendered only if two bindings match
	 * ui.conditional(
	 *   { state: $list("item").equals("selectedItem") },
	 *   ui.cell(
	 *     // ...
	 *   )
	 * )
	 */
	equals(source: Binding | string): Binding<boolean> {
		return this._addBool(source, false, true) as any;
	}

	/**
	 * Adds a filter, to perform a logical AND (i.e. `&&`) operation with another binding
	 *
	 * @summary This method can be used to combine two bindings logically, using the `&&` operator. The resulting bound value is the value of the _other_ binding, if the current bound value is equal to true (according to the `==` operator). The result is the value of the current binding, if its value is equal to false.
	 *
	 * @param source Another instance of {@link Binding}, or a source path that will be passed to {@link $bind()}
	 * @returns A new binding, typed as a union of both original types
	 *
	 * @example
	 * // A simple boolean AND
	 * $bind.boolean("itemFound").and("hasPrice")
	 *
	 * // A conditional string binding
	 * $bind.boolean("showCustomer")
	 *   .and($strf("Customer: %s", "customer.name"))
	 */
	and<U = any>(source: Binding<U> | string): Binding<T | U> {
		return this._addBool(source, true) as any;
	}

	/**
	 * Adds a filter, to perform a logical OR (i.e. `||`) operation with another binding
	 *
	 * @summary This method can be used to combine two bindings logically, using the `||` operator. The resulting bound value is the value of the _other_ binding, if the current bound value is equal to false (according to the `==` operator). The result is the value of the current binding, if its value is equal to true.
	 *
	 * @param source Another instance of {@link Binding}, or a source path that will be passed to {@link $bind()}
	 * @returns A new binding, typed as a union of both original types
	 *
	 * @example
	 * // A simple boolean OR
	 * $bind.boolean("itemFound").or("hasDefault")
	 *
	 * // A conditional string binding
	 * $bind.string("customer.name")
	 *   .or($bind("Default: %s", "defaultCustomer.name"))
	 */
	or<U = any>(source: Binding<U> | string): Binding<T | U> {
		return this._addBool(source) as any;
	}

	/**
	 * Adds a filter, to log a debug message whenever the bound value changes.
	 * @returns The binding itself, with debug events enabled
	 */
	debug() {
		let _apply = this._apply;
		this._apply = (target, update) => {
			let hasValue: boolean | undefined;
			_apply(target, (value, bound) => {
				hasValue = true;
				Binding.log_debug?.(
					this.toString() + (bound ? " =>" : " [not bound]"),
					value,
				);
				update(value, bound);
			});
			setTimeout(() => {
				if (!hasValue) Binding.log_debug?.(this.toString() + " [not bound]");
			}, 1);
		};
		return this;
	}

	/**
	 * Returns a description of this binding, including its original source path, if any.
	 * @returns The string description.
	 */
	toString() {
		return "$bind(" + this._path.join(".") + ")";
	}

	/**
	 * Returns a copy of this object
	 * - This method is used by other methods to return a new instance of the same type, before adding filters, e.g. {@link not()}.
	 */
	protected clone(): Binding<T> {
		return new Binding(this);
	}

	/** A method that's used for duck typing, always returns true */
	declare isBinding: () => true; // set on prototype

	/** A method that's used for type checking, doesn't actually exist */
	declare [BindingOrValue.TYPE_CHECK]: () => T;

	/** @internal Apply this binding to a managed object using given update callback; cascades down to child bindings (for boolean logic and string bindings) */
	_apply: (
		this: unknown,
		target: ManagedObject,
		update: (value: any, bound: boolean) => void,
	) => void;

	/** Implementation for `.and()`, `.or()`, and `.equals()` */
	private _addBool(
		other: string | Binding,
		isAnd?: boolean,
		isEqual?: boolean,
	) {
		// create other binding (if needed)
		if (!isBinding(other)) {
			other = new Binding({
				path: other.split("."),
				label: this._label,
				prefix: this._prefix,
			});
		}

		// update apply method to also apply other binding
		let result = this.clone();
		let _apply = this._apply;
		result._apply = (target, update) => {
			let currentValue = NO_VALUE;

			// keep track of status, only update when both values known
			let flags = 3;
			function set(v1: any, v2: any, noUpdate: any, bound: boolean) {
				if (noUpdate) return;
				let newValue = isEqual ? v1 === v2 : isAnd ? v1 && v2 : v1 || v2;
				if (newValue !== currentValue) {
					currentValue = newValue;
					update(newValue, bound);
				}
			}

			// keep track of both values at the same time
			let value1: any = undefined;
			let value2: any = undefined;
			_apply(target, (value, bound) =>
				set((value1 = value), value2, (flags &= 2), bound),
			);
			other._apply(target, (value, bound) =>
				set(value1, (value2 = value), (flags &= 1), bound),
			);
		};
		return result;
	}

	private _filter<V>(f: (value: T) => V | undefined) {
		let result: Binding<V> = this.clone() as any;
		let _apply = this._apply;
		result._apply = (target, update) =>
			_apply(target, (value, bound) => update(f(value), bound));
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
 * Instances of this class can be created using the {@link $strf} function.
 *
 * @example
 * // String-formatted bindings with positional arguments
 * $strf("Today is %s", $bind("dayOfTheWeek"))
 * $strf("%i table row#{/s}, total %.2f", $bind("rows.length"), $bind("calcTotal"))
 *
 * @example
 * // String-formatted binding with object argument
 * $strf(
 *   "%[user] is %[age] years old",
 *   {
 *     user: $bind("user.name", strf("Unknown user")),
 *     age: $bind.number("user.age").else(99)
 *   }
 * )
 *
 * @example
 * // A label with bound text
 * // (Note: JSX element text is bound automatically)
 * ui.label(
 *   $strf("Welcome, %s", $bind("user.fullName"))
 * )
 */
export class StringFormatBinding extends Binding<LazyString> {
	/**
	 * Creates a new string-formatted binding using; use {@link $strf()} instead
	 * @note Use the {@link $strf()} function to create {@link StringFormatBinding} objects rather than calling this constructor.
	 * @param format The format string, containing placeholders similar to {@link strf()}
	 * @param args A list of associated bindings
	 */
	constructor(format: string, ...args: Binding[] | [{ [K: string]: Binding }]) {
		super(undefined);
		this._format = format;
		if (!format) return;
		this._makeApply(format, args);
	}

	/** Returns a description of this binding, including its original format string. */
	override toString() {
		return "$strf(" + JSON.stringify(this._format) + ")";
	}

	protected override clone(): StringFormatBinding {
		let result = new StringFormatBinding("");
		result._format = this._format;
		result._apply = this._apply;
		return result;
	}

	/** Set the _apply method to update the bound string value */
	private _makeApply(
		format: string,
		args: Binding[] | [{ [K: string]: Binding }],
	) {
		let base = new LazyString(() => format).translate();
		let obj = !isBinding(args[0]) ? args[0] : undefined;
		if (obj) args = [];

		// use shortcut if no interpolation arguments at all
		if (!obj && !args.length) {
			this._apply = (_, update) => update(base.cache(), false);
			return;
		}

		// otherwise, use LazyString.format whenever bindings are updated
		this._apply = (target, update) => {
			// keep track of all bound interpolation arguments
			let values: any[] = [];
			let nBindings = 0;
			let count = 0;

			// register all nested bindings, update when values change
			function updateString() {
				if (count >= nBindings) {
					let newValue = base.format(...values).cache();
					update(newValue, true);
				}
			}
			for (let i = 0; i < args.length; i++) {
				let binding = args[i];
				if (isBinding(binding)) {
					nBindings++;
					binding._apply(target, (value) => {
						count++;
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
						obj[p]!._apply(target, (value: any) => {
							count++;
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

	private _format: string;
}

export namespace Binding {
	/**
	 * Options that can be passed to the {@link Binding} constructor, used by {@link $bind} and other binding factories
	 */
	export type Options = {
		/** The source property path, as an array */
		readonly path: string[];
		/** Default value, used when the bound value itself is undefined */
		readonly default?: any;
		/** The source label property that's used to filter parent objects */
		readonly label?: string | symbol;
		/** An optional list of property names that are prepended before all binding paths */
		readonly prefix?: ReadonlyArray<string>;
	};

	/** A binding factory that creates {@link Binding} objects for a particular source */
	export type Factory<TKey extends string> = {
		(source: TKey, defaultValue?: any): Binding;

		/** Creates a new {@link Binding} object with type `string` */
		string(source: TKey, defaultValue?: string): Binding<string>;

		/** Creates a new {@link Binding} object with type `number` */
		number(source: TKey, defaultValue?: number): Binding<number>;

		/** Creates a new {@link Binding} object with type `boolean` */
		boolean(source: TKey): Binding<boolean>;

		/** Creates a new {@link Binding} object, negating the bound value */
		not(source: TKey): Binding<boolean>;

		/** Creates a new {@link Binding} object, ensuring that the bound value is an iterable list */
		list<T = any>(source: TKey): Binding<Iterable<T>>;
	};

	/**
	 * Creates an object with methods that can be used to create bindings for a specific source
	 * - This function is used to create e.g. {@link $activity}, {@link $view}, and {@link $viewport}.
	 * - You can use this function to create your own binding factory objects, by referencing a specific property of a class (i.e. the binding source label) and/or a property name that should be used as a prefix for all bindings.
	 * @param sourceLabel The source label property that's used to filter candidate objects
	 * @param propertyName An optional property name that's used as a prefix for all bindings, must be a property of the source object
	 */
	export function createFactory<TKey extends string>(
		sourceLabel?: string | symbol,
		...properties: string[]
	): Binding.Factory<TKey> {
		let factory: Factory<TKey> = function (source: string, defaultValue?: any) {
			return new Binding({
				path: source.split("."),
				default: defaultValue,
				label: sourceLabel,
				prefix: properties,
			});
		} as any;
		factory.string = (source: TKey, defaultValue?: string) =>
			factory(source, defaultValue).asString();
		factory.number = (source: TKey, defaultValue?: number) =>
			factory(source, defaultValue).asNumber();
		factory.boolean = (source: TKey) => factory(source).asBoolean();
		factory.not = (source: TKey) => factory(source).not();
		factory.list = (source: TKey) => factory(source).asList();
		return factory;
	}
}

/**
 * A property decorator function that applies the provided binding to the decorated property
 * @param source The source (property) path that's used for obtaining the bound value, or a {@link Binding} instance
 * @note This decorator can only be used on class fields with TypeScript 5.0 or later, or environments that support the latest ECMAScript standard for decorators.
 *
 * @example
 * class MyActivity extends Activity {
 *   // ...
 *
 *   // keep this property in sync with a parent activity (if any):
 *   @binding("selectedCustomer")
 *   customer?: Customer;
 * }
 */
export function binding(source: string | Binding) {
	return function (_: unknown, context: ClassFieldDecoratorContext) {
		let binding = typeof source === "string" ? new Binding(source) : source;
		if (!(binding instanceof Binding) || context.kind !== "field") {
			throw TypeError();
		}
		context.addInitializer(function () {
			if (!(this instanceof ManagedObject)) throw Error();
			binding.bindTo(this, context.name as any);
		});
	};
}

/**
 * Creates a new generic {@link Binding}
 * @summary This function is used to create a new binding for a specific source path, with an optional default value. Calling this function is equivalent to `new Binding(sourcePath, defaultValue)`, and is the recommended way to create bindings.
 * @note You can use e.g. {@link $activity}, {@link $view}, and {@link $viewport} to create bindings for specific sources.
 * @param sourcePath The source (property) path that's used for obtaining the bound value
 * @param defaultValue An optional default value that's used when the bound value is undefined
 * @returns A new {@link Binding} object
 * @see {@link Binding}
 */
export const $bind = Binding.createFactory();

/**
 * Creates a new {@link Binding} object, for a binding that takes the value of the first binding of the specified bindings that has a non-false value
 * - This function repeatedly calls {@link Binding.or} for each source and returns the resulting binding.
 * @param sources One or more instances of {@link Binding} or source paths that will be passed to {@link $bind()}
 */
export function $either(...sources: Array<string | Binding>) {
	let result = new Binding(sources.shift());
	while (sources.length) {
		result = result.or(sources.shift()!);
	}
	return result;
}

/**
 * Creates a new {@link StringFormatBinding}
 * @summary This function is used to create a new binding for a string-formatted value with further embedded bindings. Calling this function is equivalent to `new StringFormatBinding(...)`, and is the recommended way to create such bindings.
 * @param format The format string, containing placeholders similar to {@link strf()}
 * @param args A list of associated bindings
 * @returns A new {@link StringFormatBinding} object
 * @see {@link StringFormatBinding}
 */
export function $strf(
	format: string,
	...args: Binding[] | [{ [K: string]: Binding }]
) {
	return new StringFormatBinding(format, ...args);
}
