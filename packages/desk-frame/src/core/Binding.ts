import { invalidArgErr } from "../errors.js";
import { LazyString } from "./LazyString.js";
import { ManagedEvent } from "./ManagedEvent.js";
import { ManagedObject } from "./ManagedObject.js";
import type { GlobalEmitter } from "./GlobalEmitter.js";
import { $_unlinked, watchBinding } from "./object_util.js";

/** Constant used to check against (new) binding value */
const NO_VALUE = {};

/** Method used for duck typing property */
const _isManagedBinding = function (): true {
	return true;
};

/** @internal Checks if the provided value is an instance of {@link Binding}; uses duck typing for performance */
export function isBinding<T = any>(value: any): value is Binding<T> {
	return !!(value && (value as Binding).isManagedBinding === _isManagedBinding);
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
 * **Creating bindings** — To create a binding, use one of the {@link bound()} functions to bind a number, string, (negated) boolean, list, or a string composed using a format string and one or more embedded bindings, e.g. `bound("anyValue")`, `bound.not("showList")`, `bound.string("labelText")`, or `bound.strf("Value: %i", "lines.count")`.
 *
 * **Binding to managed lists** — {@link ManagedList} instances include special properties that may be referenced by a binding path. Use `.count` to bind to the list count, `.#first` and `.#last` to bind to the first and last item in the list, respectively.
 *
 * **Applying bindings** — Include the result of {@link bound()} in the object passed to `with` to add a bound property to a view ({@link UIComponent} or {@link ViewComposite}), e.g. `UILabel.with({ text: bound.string("labelText") })`. Note that some view classes include shortcut methods, such as `UILabel.withText(bound.string("labelText"))`, which also accept bindings.
 *
 * To apply a binding to any other managed object, use to the {@link Binding.bindTo bindTo()} method. This method can be used to bind a target property, or to call a function whenever the source value changes.
 *
 * **Adding filters** — To convert the value of the original property, or to combine multiple bindings using boolean operations (and/or), use one of the Binding methods such as {@link Binding.and and()}, {@link Binding.select select()}, {@link Binding.matches matches()}, or {@link Binding.strf strf()}.
 *
 * @see {@link StringFormatBinding}
 * @see {@link bound}
 * @see {@link bound.number}
 * @see {@link bound.string}
 * @see {@link bound.boolean}
 * @see {@link bound.not}
 * @see {@link bound.list}
 * @see {@link bound.strf}
 *
 * @example
 * // A view and an activity, connected using one-way bindings:
 * const BodyView = UIColumn.with(
 *   // bind the text to a string including a nested binding:
 *   UILabel.withText(bound.strf("Username: %s", "user.name")),
 *   UIList.with(
 *     { items: bound.list("roles") },
 *     UIRow.with(
 *       // note: within the list, we can bind to 'item'
 *       UIExpandedLabel.withText(bound.string("item")),
 *       UILinkButton.withLabel("Remove", "RemoveRole")
 *     )
 *   )
 * );
 *
 * export class MyActivity extends PageViewActivity {
 *   static override ViewBody = BodyView;
 *   user = { name: "Foo Bar" };
 *   roles = ["Administrator", "Contributor", "Viewer"];
 *   onRemoveRole(e: UIList.ItemEvent<string>) {
 *     this.roles = this.roles.filter((s) => s !== e.delegate.item);
 *   }
 * }
 */
export class Binding<T = any> {
	/** Event emitter used by {@link Binding.debug()} */
	declare static debugEmitter: GlobalEmitter<Binding.DebugEvent>;

	/**
	 * Creates a new binding for given property and default value; use {@link bound()} functions instead
	 * @note Use the {@link bound} function to create {@link Binding} objects rather than calling this constructor.
	 * @param source The source path that's used for obtaining the bound value
	 * @param defaultValue An optional default value that's used when the bound value is undefined
	 */
	constructor(source?: string, defaultValue?: T) {
		if (source !== undefined && typeof source !== "string")
			throw invalidArgErr("source");
		this._source = "bound(" + (source || "") + ")";
		let path: string[];

		// set basic apply method (function bound to this instance)
		this._apply = !source
			? function () {}
			: (register, update) =>
					register(
						path,
						(value, bound) => update(value ?? defaultValue, bound),
						this._events,
					);

		// parse source path
		if (!source) {
			path = [];
		} else {
			// TODO(deprecation): Maybe mark this as deprecated? For now, this is just not documented,
			// in favor of using `bound.not(...)` which is more consistent.
			// If you find this comment, DO NOT USE this pattern :)
			while (source[0] === "!") {
				source = source.slice(1);
				this.not();
			}
			path = source.split(".");
		}
	}

	/**
	 * Applies this binding to the specified target object
	 * - This method should only be used once for each target, preferably from a constructor, since each call adds a new property observer.
	 * - The same binding can be applied multiple times (e.g. to different instances of an activity), removing the need to create a new {@link Binding} instance each time.
	 * @param target The target (attached) object
	 * @param propertyOrFunction The property to update, or a custom function to handle value updates
	 */
	bindTo<TObject extends ManagedObject>(
		target: TObject,
		propertyOrFunction:
			| keyof TObject
			| ((value?: T, bound?: boolean, forced?: boolean) => void),
	) {
		if (target[$_unlinked]) return;

		if (typeof propertyOrFunction !== "function") {
			let p = propertyOrFunction;
			propertyOrFunction = function (v: any) {
				(target as any)[p] = v;
			};

			// create property if it doesn't exist yet
			if (!(p in target)) target[p] = undefined as any;
		}
		this._apply(watchBinding.bind(undefined, target), propertyOrFunction);
	}

	/**
	 * Adds a filter, to convert the bound value to a string.
	 * @param format A {@link strf} format placeholder (without `%` character) to format the value, e.g. `n`, `.2f`, `lc`
	 * @returns The binding itself, typed as a string
	 */
	asString(format?: string): Binding<string> {
		let _apply = this._apply;
		this._apply = (register, update) =>
			_apply(register, (value, bound) =>
				update(
					format ? LazyString.formatValue(format, value) : String(value ?? ""),
					bound,
				),
			);
		return this as any;
	}

	/**
	 * Adds a filter, to convert the bound value to a number.
	 * @returns The binding itself, typed as a number
	 */
	asNumber(): Binding<number> {
		let _apply = this._apply;
		this._apply = (register, update) =>
			_apply(register, (value, bound) => update(+value, bound));
		return this as any;
	}

	/**
	 * Adds a filter, to make sure that the bound value is an iterable list
	 * - This method allows arrays, Maps, ManagedList instances, and any other object that includes Symbol.iterator.
	 * - Other values are changed to undefined.
	 * @returns The binding itself, typed as an Iterable object
	 */
	asList<T = any>(): Binding<Iterable<T>> {
		let _apply = this._apply;
		this._apply = (register, update) =>
			_apply(register, (value, bound) =>
				update(
					value && typeof value === "object" && Symbol.iterator in value
						? value
						: undefined,
					bound,
				),
			);
		return this as any;
	}

	/**
	 * Adds a filter, to convert the bound value to a boolean.
	 * @returns The binding itself, typed as a boolean
	 */
	asBoolean(): Binding<boolean> {
		let _apply = this._apply;
		this._apply = (register, update) =>
			_apply(register, (value, bound) => update(!!value, bound));
		return this as any;
	}

	/**
	 * Adds a filter, to convert the bound value to a boolean, and negate it.
	 * @returns The binding itself, typed as a boolean
	 */
	not(): Binding<boolean> {
		// TODO(code size): all of these methods could use a helper function to set
		// this._apply and update source string; which would decrease code size
		let _apply = this._apply;
		this._apply = (register, update) =>
			_apply(register, (value, bound) => update(!value, bound));
		return this as any;
	}

	/**
	 * Adds a filter, to _include_ the bound value in a formatted string.
	 *
	 * @summary This method uses the bound value as a single placeholder value in a formatted string (as if {@link strf()} is used with the provided format string, and the current value of the binding).
	 *
	 * Note that you can also use {@link bound.strf()} or {@link Binding.asString()} to create formatted string bindings.
	 * - Use {@link Binding.asString()} for single values such as numbers, e.g. `bound.number("price").asString(".2f")`.
	 * - Use {@link bound.strf()} to include _multiple_ bound values in a single string.
	 * - The {@link bound.strf()} function adds a slight overhead, since it creates an additional binding.
	 *
	 * @param format The format string, as if passed to {@link strf()}; may include one placeholder, for the bound value
	 * @returns The binding itself, typed as a string
	 *
	 * @example
	 * // A label with text that includes a bound number property
	 * UILabel.withText(
	 *   bound("nEmails")
	 *     .strf("You have %n email#{/s}")
	 * )
	 *
	 * // Same as the following, at a slight overhead
	 * UILabel.withText(
	 *   bound.strf("You have %n email#{/s}", "nEmails")
	 * )
	 */
	strf(format: string): Binding<LazyString> {
		let _apply = this._apply;
		let str = new LazyString(() => String(format)).translate();
		this._apply = (register, update) =>
			_apply(register, (value, bound) =>
				update(str.format(value).cache(), bound),
			);
		if (this._source) this._source += ".strf()";
		return this as any;
	}

	/**
	 * Adds a filter, to use the current I18n provider to localize the bound value
	 * - The provided type is passed directly to the I18n provider. Commonly used types include `date` (with an additional `long` or `short` argument), and `currency` (with an optional currency symbol argument).
	 *
	 * @param type Argument(s) passed to {@link I18nProvider.format()}
	 * @returns The binding itself, typed as a string
	 *
	 * @example
	 * // A label that shows a short last-modified date
	 * UILabel.withText(
	 *   bound("lastModified").local("date", "short")
	 * )
	 */
	local(...type: string[]): Binding<string> {
		let _apply = this._apply;
		this._apply = (register, update) =>
			_apply(register, (value, bound) =>
				update(LazyString.local(value, ...type), bound),
			);
		if (this._source) this._source += ".local()";
		return this as any;
	}

	/**
	 * Adds a filter, to use one of the provided values instead of the bound value
	 *
	 * @summary This method can be used to substitute the bound value with a fixed value. If the bound value is equal to true (according to the `==` operator), the value is replaced with the provided `trueValue`. Otherwise, the value is replaced with the provided `falseValue`, e.g. for bound undefined, null, false, zero, and empty string values. If `falseValue` isn't provided, undefined is used.
	 *
	 * @param trueValue The value to be used if the bound value is equal to true
	 * @param falseValue The value to be used if the bound value is equal to false
	 * @returns The binding itself, typed like both of the given values
	 *
	 * @example
	 * // A label that displays (localized) Yes or No
	 * // depending on a property value
	 * UILabel.withText(
	 *   bound("isEnabled").select(strf("Yes"), strf("No"))
	 * )
	 */
	select<U, V>(trueValue: U, falseValue?: V): Binding<U | V> {
		let _apply = this._apply;
		this._apply = (register, update) =>
			_apply(register, (value, bound) =>
				update(value ? trueValue : falseValue, bound),
			);
		if (this._source) this._source += ".select()";
		return this as any;
	}

	/**
	 * Adds a filter, to use the provided value instead of a bound value that's equal to false
	 *
	 * @summary This method can be used to substitute the bound value with a fixed value, if the bound value is equal to false (according to the `==` operator), e.g. for bound undefined, null, false, zero, and empty string values.
	 * @note Alternatively, use the `defaultValue` argument to the {@link bound()} function to specify a default value that's used if the bound value is undefined.
	 *
	 * @param falseValue The value to be used if the bound value is equal to false
	 * @returns The binding itself, typed like the given value
	 *
	 * @example
	 * // A label that displays a value OR (localized) "None"
	 * UILabel.withText(
	 *   bound("customer.name").else(strf("None"))
	 * )
	 */
	else<U>(falseValue: U): Binding<T | U> {
		let _apply = this._apply;
		this._apply = (register, update) =>
			_apply(register, (value, bound) =>
				update(value || (falseValue as any), bound),
			);
		if (this._source) this._source += ".else()";
		return this as any;
	}

	/**
	 * Adds a filter, to compare the bound value and replace it with true or false
	 *
	 * @summary This method can be used to substitute the bound value with true or false. If the original value matches at least one of the provided values, it's replaced with true; otherwise with false.
	 *
	 * To do the opposite, and substitute with false if any of the provided values match, use the {@link Binding.not not()} method afterwards (see example).
	 *
	 * @param values A list of values to compare the bound value to
	 * @returns The binding itself, typed as a boolean
	 *
	 * @example
	 * // A cell that's rendered only if a string matches
	 * UIConditional.with(
	 *   { state: bound("tab").matches("contacts") },
	 *   UICell.with(
	 *     // ...
	 *   )
	 * )
	 *
	 * @example
	 * // A cell that's hidden if a string doesn't match
	 * UICell.with(
	 *   { hidden: bound("tab").matches("contacts").not() },
	 *   // ...
	 * )
	 */
	matches(...values: any[]): Binding<boolean> {
		let _apply = this._apply;
		this._apply = (register, update) =>
			_apply(register, (value, bound) =>
				update(
					values.some((a) => a === value),
					bound,
				),
			);
		if (this._source) this._source += ".matches()";
		return this as any;
	}

	/**
	 * Adds a filter, to compare the bound value with another bound value
	 *
	 * @summary This method can be used to compare two bindings. If the original value matches the value of the provided binding, the bound value becomes true, otherwise false.
	 *
	 * To do the opposite, and substitute with false if the bindings match, use the {@link Binding.not not()} method afterwards.
	 *
	 * @param source Another instance of {@link Binding}, or a source path that will be passed to {@link bound()}
	 * @returns The binding itself, typed as a boolean
	 *
	 * @example
	 * // A cell that's rendered only if two bindings match
	 * UIConditional.with(
	 *   { state: bound("item").equals("selectedItem") },
	 *   UICell.with(
	 *     // ...
	 *   )
	 * )
	 */
	equals(source: Binding | string): Binding<boolean> {
		let binding = isBinding(source) ? source : new Binding(source);
		this._addBool(binding, false, true);
		if (this._source) this._source += ".equals(" + binding._source + ")";
		return this as any;
	}

	/**
	 * Adds a filter, to perform a logical AND (i.e. `&&`) operation with another binding
	 *
	 * @summary This method can be used to combine two bindings logically, using the `&&` operator. The resulting bound value is the value of the _other_ binding, if the current bound value is equal to true (according to the `==` operator). The result is the value of the current binding, if its value is equal to false.
	 *
	 * @param source Another instance of {@link Binding}, or a source path that will be passed to {@link bound()}
	 * @returns The binding itself, typed as a union of both original types
	 *
	 * @example
	 * // A simple boolean AND
	 * bound.boolean("itemFound").and("hasPrice")
	 *
	 * // A conditional string binding
	 * bound.boolean("showCustomer")
	 *   .and(bound.strf("Customer: %s", "customer.name"))
	 */
	and<U = any>(source: Binding<U> | string): Binding<T | U> {
		let binding = isBinding<U>(source) ? source : new Binding(source);
		this._addBool(binding, true);
		if (this._source) this._source += " and " + String(source);
		return this as any;
	}

	/**
	 * Adds a filter, to perform a logical OR (i.e. `||`) operation with another binding
	 *
	 * @summary This method can be used to combine two bindings logically, using the `||` operator. The resulting bound value is the value of the _other_ binding, if the current bound value is equal to false (according to the `==` operator). The result is the value of the current binding, if its value is equal to true.
	 *
	 * @param source Another instance of {@link Binding}, or a source path that will be passed to {@link bound()}
	 * @returns The binding itself, typed as a union of both original types
	 *
	 * @example
	 * // A simple boolean OR
	 * bound.boolean("itemFound").or("hasDefault")
	 *
	 * // A conditional string binding
	 * bound.string("customer.name")
	 *   .or(bound.strf("Default: %s", "defaultCustomer.name"))
	 */
	or<U = any>(source: Binding<U> | string): Binding<T | U> {
		let binding = isBinding<U>(source) ? source : new Binding(source);
		this._addBool(binding);
		if (this._source) this._source += " or " + String(source);
		return this as any;
	}

	/**
	 * Adds a filter, to emit an event whenever the bound value changes.
	 * - For every change, an event will be emitted on {@link Binding.debugEmitter}. Events include both a reference to the binding and its new value, see {@link Binding.DebugEvent}.
	 */
	debug() {
		let _apply = this._apply;
		this._apply = (register, update) => {
			let hasValue: boolean | undefined;
			_apply(register, (value, bound) => {
				hasValue = true;
				Binding.debugEmitter.emit("Debug", {
					binding: this,
					value,
					bound,
				});
				update(value, bound);
			});
			setTimeout(() => {
				if (!hasValue) {
					Binding.debugEmitter.emit("Debug", { binding: this, bound: false });
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
		return this._source;
	}

	/** A method that's used for duck typing, always returns true */
	declare isManagedBinding: () => true; // set on prototype

	/** @internal Apply this binding to a managed object using given callbacks; cascades down to child bindings (for boolean logic and string bindings) */
	_apply: (
		register: (
			path: readonly string[],
			callback: (value: any, bound: boolean) => void,
			watchChangeEvents?: boolean,
		) => void,
		update: (value: any, bound: boolean) => void,
	) => void;

	/** Implementation for `.and()`, `.or()`, and `.equals()` */
	private _addBool(binding: Binding, isAnd?: boolean, isEqual?: boolean) {
		// update apply method to also apply other binding
		let _apply = this._apply;
		this._apply = (register, update) => {
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
			_apply(register, (value, bound) =>
				set((value1 = value), value2, (flags &= 2), bound),
			);
			binding._apply(register, (value, bound) =>
				set(value1, (value2 = value), (flags &= 1), bound),
			);
		};
	}

	/** Binding source text */
	private _source?: string;

	/** True if binding should be updated when a change event is emitted on a bound managed object (if it's the current value of the binding; only set when filters are added) */
	private _events?: boolean;
}

Binding.prototype.isManagedBinding = _isManagedBinding;

/**
 * A class that represents a string-formatted binding with nested property bindings
 *
 * @description
 * String-formatted bindings use a 'format string' that contains one or more placeholders, along with a set of associated (nested) bindings. They can be used just like regular property bindings (see {@link Binding}).
 *
 * After binding to an object, the underlying string value is updated whenever any of the nested bindings change — inserting the bound values into the string.
 *
 * Instances of this class can be created using the {@link bound.strf} function.
 *
 * @example
 * // String-formatted bindings with positional arguments
 * bound.strf("Today is %s", "dayOfTheWeek")
 * bound.strf("%i table row#{/s}, total %.2f", "rows.length", "calcTotal")
 *
 * @example
 * // String-formatted binding with object argument
 * bound.strf(
 *   "%[user] is %[age] years old",
 *   {
 *     user: bound("user.name", strf("Unknown user")),
 *     age: bound.number("user.age").else(99)
 *   }
 * )
 *
 * @example
 * // A label with bound text
 * // (Note: JSX element text is bound automatically, see `JSX`)
 * UILabel.withText(
 *   bound.strf("Welcome, %s", "user.fullName")
 * )
 */
export class StringFormatBinding<
	S extends string = string,
> extends Binding<LazyString> {
	/**
	 * Creates a new string-formatted binding using; use {@link bound.strf()} instead
	 * @note Use the {@link bound.strf()} function to create {@link StringFormatBinding} objects rather than calling this constructor.
	 * @param format The format string, containing placeholders similar to {@link strf()}
	 * @param args A list of associated bindings, or source paths that will be passed to {@link bound()}
	 */
	constructor(format: S, ...args: Binding.StringFormatArgsFor<S>) {
		super(undefined);
		this._format = format;

		// create bindings for string arguments
		let bindings = args.map((a) =>
			typeof a === "string" ? new Binding(a) : a,
		);

		// handle object as first argument, create bindings
		let obj: any = !isBinding(bindings[0]) ? bindings[0] : undefined;
		if (obj) {
			for (let p in obj) {
				if (typeof obj[p] === "string") {
					obj[p] = new Binding(obj[p]);
				}
			}
		}

		// override apply method to update with string value
		this._makeApply(format, bindings, obj);
	}

	/** Returns a description of this binding, including its original format string. */
	override toString() {
		return "bound.strf(" + JSON.stringify(this._format) + ")";
	}

	/** Set the _apply method to update the bound string value */
	private _makeApply(format: string, bindings: Binding[], obj?: any) {
		let base = new LazyString(() => format).translate();

		// use shortcut if no interpolation arguments at all
		if (!bindings.length) {
			this._apply = (register, update) => update(base.cache(), false);
			return;
		}

		// otherwise, use LazyString.format whenever bindings are updated
		this._apply = (register, update) => {
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
			for (let i = 0; i < bindings.length; i++) {
				if (isBinding(bindings[i])) {
					nBindings++;
					bindings[i]!._apply(register, (value) => {
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
						obj[p]!._apply(register, (value: any) => {
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
	/** The type of event that's emitted by {@link Binding.debugEmitter} */
	export type DebugEvent = ManagedEvent<
		GlobalEmitter<DebugEvent>,
		{ binding: Binding; value?: any; bound: boolean },
		"Debug"
	>;

	/** A type that's used to check binding path strings */
	export type ValidPathString<S> = S extends `${string}${
		| " "
		| "%"
		| "("
		| ")"
		| "["
		| "]"
		| "{"
		| "}"
		| "|"
		| "&"
		| ","
		| "?"}${string}`
		? "Error: Invalid character in binding path"
		: S extends string
		? S
		: "Error: Invalid argument";

	/** A type that's used to determine the arguments for {@link bound.strf()} */
	export type StringFormatArgsFor<S extends string> =
		S extends `${string}${"%["}${string}`
			? [{ [p: string]: Binding | string }, ...Array<Binding | string>]
			: Array<Binding | string>;
}

/**
 * Creates a new property binding
 * - This function creates a `{@link Binding}<any>` instance. Use {@link bound.number()}, {@link bound.string()}, {@link bound.boolean()}, {@link bound.not()}, and {@link bound.list()} to create typed bindings.
 * - The {@link bound.strf()} function can be used to create a {@link StringFormatBinding} instance.
 * @param source The source property name or path
 * @param defaultValue An optional default value, that's used instead of the bound value when undefined
 * @returns A new {@link Binding} instance.
 * @see {@link Binding}
 */
export function bound<S>(
	source: Binding.ValidPathString<S>,
	defaultValue?: any,
) {
	return new Binding<any>(source, defaultValue);
}

export namespace bound {
	/**
	 * Creates a new property binding, for a number value
	 * @param source The source property name or path
	 * @param defaultValue An optional default value, that's used instead of the bound value when undefined
	 * @returns A new {@link Binding} instance.
	 * @see {@link Binding.asNumber}
	 */
	export function number<S>(
		source: Binding.ValidPathString<S>,
		defaultValue?: number,
	) {
		return new Binding(source, defaultValue).asNumber();
	}

	/**
	 * Creates a new property binding, for a string value
	 * @param source The source property name or path
	 * @param defaultValue An optional default value, that's used instead of the bound value when undefined
	 * @returns A new {@link Binding} instance.
	 * @see {@link Binding.asString}
	 */
	export function string<S>(
		source: Binding.ValidPathString<S>,
		defaultValue?: string,
	) {
		return new Binding(source, defaultValue).asString();
	}

	/**
	 * Creates a new property binding, for a boolean value
	 * @param source The source property name or path
	 * @param defaultValue An optional default value, that's used instead of the bound value when undefined
	 * @returns A new {@link Binding} instance.
	 * @see {@link Binding.asBoolean}
	 */
	export function boolean<S>(
		source: Binding.ValidPathString<S>,
		defaultValue?: boolean,
	) {
		return new Binding(source, defaultValue).asBoolean();
	}

	/**
	 * Creates a new property binding, negating the bound value using the `!` operator
	 * @param source The source property name or path
	 * @param defaultValue An optional default value, that's used instead of the bound value when undefined
	 * @returns A new {@link Binding} instance.
	 * @see {@link Binding.not}
	 *
	 * @example
	 * // Show a cell only when a property is true
	 * UICell.with(
	 *   { hidden: bound.not("showCell") },
	 *   // ...cell content
	 * )
	 */
	export function not<S>(
		source: Binding.ValidPathString<S>,
		defaultValue?: boolean,
	) {
		return new Binding(source, defaultValue).not();
	}

	/**
	 * Creates a new property binding, for an iterable value (array, Map, ManagedList, and others)
	 * @param source The source property name or path
	 * @param defaultValue An optional default value, that's used instead of the bound value when undefined
	 * @returns A new {@link Binding} instance.
	 * @see {@link Binding.asList}
	 *
	 * @example
	 * // Bind a list view to a ManagedList (or array) property
	 * UIList.with(
	 *   { items: bound.list("users") },
	 *   UIRow.with(
	 *     // ...content for each user
	 *   )
	 * )
	 */
	export function list<S>(source: Binding.ValidPathString<S>) {
		return new Binding(source).asList();
	}

	/**
	 * Creates a new string-formatted binding, with nested property bindings
	 * - Refer to {@link StringFormatBinding} for more information on string-formatted bindings.
	 * - You can also use {@link Binding.asString()} to format single values, e.g. `bound("n").asString(".2f")`, which introduces slightly less overhead.
	 * @param format The format string
	 * @param bindings A list of associated bindings, or source paths that will be passed to {@link bound()}
	 * @returns A new {@link StringFormatBinding} instance.
	 */
	export function strf<S extends string>(
		format: S,
		...bindings: Binding.StringFormatArgsFor<S>
	) {
		return new StringFormatBinding<S>(format, ...bindings);
	}
}
