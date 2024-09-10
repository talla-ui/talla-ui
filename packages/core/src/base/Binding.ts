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
 * **Creating bindings** — To create a binding, use the {@link bind()} function, or one of the methods of objects such as {@link $activity} and {@link $view} to bind a number, string, (negated) boolean, list, or a string composed using a format string and one or more embedded bindings, e.g. `bind("anyValue")`, `bind.not("showList")`, `$activity.string("labelText")`, or `bind.strf("Value: %i", $activity.number("lines.count"))`.
 *
 * **Binding to managed lists** — {@link ManagedList} instances include special properties that may be referenced by a binding path. Use `.count` to bind to the list count, `.#first` and `.#last` to bind to the first and last item in the list, respectively.
 *
 * **Binding to services** — Bindings can also be used to maintain references to services, using the {@link $services} object (or e.g. `bind("services.MyService")`). These bindings are updated whenever the service is added or removed from the service registry, as long as the object that the binding is applied to is also part of the app hierarchy.
 *
 * **Applying bindings** — Include the result of {@link bind()} in the preset object or parameters passed to {@link ui} factory functions (or JSX attributes), to add a bound property to a view, e.g. `ui.label($activity.string("labelText"))` or `<textfield placeholder={$view.string("placeholderText")} />`.
 *
 * To apply a binding to any other managed object, use to the {@link bindTo()} method. This method can be used to bind a target property, or to call a function whenever the source value changes.
 *
 * **Adding filters** — To convert the value of the original property, or to combine multiple bindings using boolean operations (and/or), use one of the Binding methods such as {@link Binding.and and()}, {@link Binding.select select()}, or {@link Binding.matches matches()}.
 *
 * @see {@link StringFormatBinding}
 * @see {@link bind}
 */
export class Binding<T = any> {
	/**
	 * Static (global) debug handler for binding changes
	 * - This handler is called whenever a binding is updated for which the {@link Binding.debug()} method was called.
	 * - The handler is not set by default, and can be set to a function if needed (i.e. to analyze issues with bindings in development; do NOT use {@link Binding.debug()} or set this handler in a production application).
	 */
	declare static debugHandler?: (data: Binding.DebugUpdate) => void;

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
			if (source.prefix) {
				this._prefix = true;
				this._path.unshift(source.prefix);
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
	private _path: string[];

	/** Property to filter source origin objects, i.e. only consider objects that include this property */
	private _label?: string | symbol;

	/** True if the first part of the path is a fixed property prefix, e.g. for {@link $viewport} */
	private _prefix?: boolean;

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
	 *   bind("lastModified").local("date", "short")
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
	 *   bind("isEnabled").select(strf("Yes"), strf("No"))
	 * )
	 */
	select<U, V>(trueValue: U, falseValue?: V): Binding<U | V> {
		return this._filter((value) => (value ? trueValue : falseValue));
	}

	/**
	 * Adds a filter, to use the provided value instead of a bound value that's equal to false
	 *
	 * @summary This method can be used to substitute the bound value with a fixed value, if the bound value is equal to false (according to the `==` operator), e.g. for bound undefined, null, false, zero, and empty string values.
	 * @note Alternatively, use the `defaultValue` argument to the {@link bind()} function to specify a default value that's used if the bound value is undefined.
	 *
	 * @param falseValue The value to be used if the bound value is equal to false
	 * @returns A new binding, typed like the given value
	 *
	 * @example
	 * // A label that displays a value OR (localized) "None"
	 * ui.label(
	 *   bind("customer.name").else(strf("None"))
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
	 *   { state: $activity.bind("tab").matches("contacts") },
	 *   ui.cell(
	 *     // ...
	 *   )
	 * )
	 *
	 * @example
	 * // A cell that's hidden if a string doesn't match
	 * ui.cell(
	 *   { hidden: $activity.bind("tab").matches("contacts").not() },
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
	 * @param source Another instance of {@link Binding}, or a source path that will be passed to {@link bind()}
	 * @returns A new binding, typed as a boolean
	 *
	 * @example
	 * // A cell that's rendered only if two bindings match
	 * ui.conditional(
	 *   { state: $list.bind("item").equals("selectedItem") },
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
	 * @param source Another instance of {@link Binding}, or a source path that will be passed to {@link bind()}
	 * @returns A new binding, typed as a union of both original types
	 *
	 * @example
	 * // A simple boolean AND
	 * bind.boolean("itemFound").and("hasPrice")
	 *
	 * // A conditional string binding
	 * bind.boolean("showCustomer")
	 *   .and(bind.strf("Customer: %s", "customer.name"))
	 */
	and<U = any>(source: Binding<U> | string): Binding<T | U> {
		return this._addBool(source, true) as any;
	}

	/**
	 * Adds a filter, to perform a logical OR (i.e. `||`) operation with another binding
	 *
	 * @summary This method can be used to combine two bindings logically, using the `||` operator. The resulting bound value is the value of the _other_ binding, if the current bound value is equal to false (according to the `==` operator). The result is the value of the current binding, if its value is equal to true.
	 *
	 * @param source Another instance of {@link Binding}, or a source path that will be passed to {@link bind()}
	 * @returns A new binding, typed as a union of both original types
	 *
	 * @example
	 * // A simple boolean OR
	 * bind.boolean("itemFound").or("hasDefault")
	 *
	 * // A conditional string binding
	 * bind.string("customer.name")
	 *   .or(bind.strf("Default: %s", "defaultCustomer.name"))
	 */
	or<U = any>(source: Binding<U> | string): Binding<T | U> {
		return this._addBool(source) as any;
	}

	/**
	 * Adds a filter, to emit an event whenever the bound value changes.
	 * - For every change, the {@link Binding.debugHandler} handler function is called with the new value and a boolean flag indicating whether the value is bound.
	 * @returns The binding itself, with debug events enabled
	 */
	debug() {
		let _apply = this._apply;
		this._apply = (target, update) => {
			let hasValue: boolean | undefined;
			_apply(target, (value, bound) => {
				hasValue = true;
				Binding.debugHandler?.({ binding: this, value, bound });
				update(value, bound);
			});
			setTimeout(() => {
				if (!hasValue) {
					Binding.debugHandler?.({ binding: this, bound: false });
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
				prefix: this._prefix ? this._path[0] : undefined,
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
 * Instances of this class can be created using the {@link bind.strf} function.
 *
 * @example
 * // String-formatted bindings with positional arguments
 * bind.strf("Today is %s", bind("dayOfTheWeek"))
 * bind.strf("%i table row#{/s}, total %.2f", bind("rows.length"), bind("calcTotal"))
 *
 * @example
 * // String-formatted binding with object argument
 * bind.strf(
 *   "%[user] is %[age] years old",
 *   {
 *     user: bind("user.name", strf("Unknown user")),
 *     age: bind.number("user.age").else(99)
 *   }
 * )
 *
 * @example
 * // A label with bound text
 * // (Note: JSX element text is bound automatically)
 * ui.label(
 *   bind.strf("Welcome, %s", bind("user.fullName"))
 * )
 */
export class StringFormatBinding extends Binding<LazyString> {
	/**
	 * Creates a new string-formatted binding using; use {@link bind.strf()} instead
	 * @note Use the {@link bind.strf()} function to create {@link StringFormatBinding} objects rather than calling this constructor.
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
		return "bind.strf(" + JSON.stringify(this._format) + ")";
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
	 * Options that can be passed to the {@link Binding} constructor, used by {@link Binding.Source}
	 * @see {@link bind.$on}
	 */
	export type Options = {
		/** The source property path, as an array */
		path: string[];
		/** Default value, used when the bound value itself is undefined */
		default?: any;
		/** The source label property that's used to filter parent objects */
		label?: string | symbol;
		/** An optional property name that's used as a prefix for all bindings */
		prefix?: string;
	};

	/**
	 * An object that's provided to the static debug handler, if any
	 * @see {@link Binding.debug}
	 * @see {@link Binding.debugHandler}
	 */
	export type DebugUpdate = {
		/** The binding that has been updated */
		binding: Binding;
		/** The current value, if any */
		value?: any;
		/** True if the binding is currently bound to a source property */
		bound: boolean;
	};

	/**
	 * A class that helps to create bindings for a specific source
	 * - Instances of this class are created using the {@link bind.$on()} function.
	 * - All bindings created using this class are bound using a source 'label' (i.e. a unique property), to bind to a specific type of object, e.g. activities or view composites.
	 * - Additionally, a property name may be used as a prefix for all bindings, e.g. for `services` and `viewport` on the {@link app} object.
	 *
	 * @docgen {hideconstructor}
	 */
	export class Source<TKey extends string = string> {
		/**
		 * Creates a new instance, do not use directly
		 * @see {@link bind.$on}
		 */
		constructor(sourceLabel: string | symbol, propertyName?: string) {
			this._label = sourceLabel;
			this._prefix = propertyName;
		}

		/** Label used for this binding source */
		private _label: string | symbol;

		/** Prefix added in front of all binding paths */
		private _prefix?: string;

		/** Creates a new {@link Binding} object */
		bind<T = unknown>(source: TKey, defaultValue?: any) {
			return new Binding({
				path: source.split("."),
				default: defaultValue,
				label: this._label,
				prefix: this._prefix,
			});
		}

		/**
		 * Creates a new {@link Binding} object with type `string`
		 * @see {@link Binding.asString}
		 */
		string(source: TKey, defaultValue?: string) {
			return this.bind(source, defaultValue).asString();
		}

		/**
		 * Creates a new {@link Binding} object with type `number`
		 * @see {@link Binding.asNumber}
		 */
		number(source: TKey, defaultValue?: number) {
			return this.bind(source, defaultValue).asNumber();
		}

		/**
		 * Creates a new {@link Binding} object with type `boolean`
		 * @see {@link Binding.asBoolean}
		 */
		boolean(source: TKey) {
			return this.bind(source).asBoolean();
		}

		/**
		 * Creates a new {@link Binding} object, negating the bound value
		 * @see {@link Binding.not}
		 */
		not(source: TKey) {
			return this.bind(source).not();
		}

		/**
		 * Creates a new {@link Binding} object, ensuring that the bound value is an iterable list
		 * @see {@link Binding.asList}
		 */
		list<T = any>(source: TKey) {
			return this.bind(source).asList<T>();
		}
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
 *
 *   // set this property to a service using its ID:
 *   @binding($services.bind("MyService"))
 *   myService?: MyService;
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
 * Creates a new {@link Binding}
 * @summary This function is used to create a new binding for a specific source path, with an optional default value. Calling this function is equivalent to `new Binding(sourcePath, defaultValue)`, and is the recommended way to create bindings.
 * @note You can use objects such as {@link $activity}, {@link $view}, {@link $services}, and {@link $viewport} to create bindings for specific sources; or create your own binding method objects using {@link bind.$on()}.
 * @param sourcePath The source (property) path that's used for obtaining the bound value
 * @param defaultValue An optional default value that's used when the bound value is undefined
 * @returns A new {@link Binding} object
 * @see {@link Binding}
 */
export function bind(sourcePath: string, defaultValue?: any) {
	return new Binding(sourcePath, defaultValue);
}

export namespace bind {
	/**
	 * Creates a new {@link Binding} object, negating the bound value
	 * @see {@link Binding.not}
	 */
	export function not(source: string) {
		return new Binding(source).not();
	}

	/**
	 * Creates an object with methods that can be used to create bindings for a specific source
	 * - This function is used to create objects such as {@link $activity}, {@link $view}, {@link $services}, and {@link $viewport}.
	 * - You can use this function to create your own binding factory objects, by referencing a specific property of a class (i.e. the binding source label) and/or a property name that should be used as a prefix for all bindings.
	 * @param sourceLabel The source label property that's used to filter candidate objects
	 * @param propertyName An optional property name that's used as a prefix for all bindings, must be a property of the source object
	 */
	export function $on<TKey extends string>(
		sourceLabel: string | symbol,
		propertyName?: string,
	): Binding.Source<TKey> {
		return new Binding.Source(sourceLabel, propertyName);
	}

	/**
	 * Creates a new {@link StringFormatBinding}
	 * @summary This function is used to create a new binding for a string-formatted value with further embedded bindings. Calling this function is equivalent to `new StringFormatBinding(...)`, and is the recommended way to create such bindings.
	 * @param format The format string, containing placeholders similar to {@link strf()}
	 * @param args A list of associated bindings
	 * @returns A new {@link StringFormatBinding} object
	 * @see {@link StringFormatBinding}
	 */
	export function strf(
		format: string,
		...args: Binding[] | [{ [K: string]: Binding }]
	) {
		return new StringFormatBinding(format, ...args);
	}
}
