import { DeferredString, fmt, StringConvertible } from "@talla-ui/util";
import { invalidArgErr } from "../errors.js";
import { ObservableObject } from "./ObservableObject.js";
import {
	$_bind_apply,
	BoundResult,
	rebind,
	watchBinding,
} from "./object_util.js";

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
 * A binding connects an object (an instance of {@link ObservableObject}) with one of the properties of one of another object: either a specified source object, or one of the target object's _containing_ (attached) objects. Bindings can be used to update properties on the target object, keeping the bound property in sync with the original property.
 *
 * For example, given an object `A` with property `p`, a binding can be used on an attached object `B` to update target property `q`. When the value of `p` changes, the same value is set on `q` immediately. This is considered a one-way data binding, since direct updates on property `q` don't affect the source property `p` at all.
 *
 * To make bindings work across a chain — or technically, a tree structure — of attached objects, bindings keep track of object attachments _to_ the target object (i.e. object B) all the way up the chain, to find a matching source property. Therefore, a binding on `C`, itself attached from `B`, may _also_ read property values from `A`.
 *
 * Instead of a single source property, bindings can also specify a source property 'path' using dots to separate property names: a path of `p.foo.bar` first watches `p`, then (if `p` refers to an object) its property `foo`, and so on — going first _up_ the tree structure to find the object containing `p`, and then down again to find the rest.
 *
 * As a concrete example, a binding can be used to update the `text` property of a {@link UIText} view, with the value of a string property `someText` of the activity. Or perhaps the property `name` of a `user` object referenced by the activity (see example below). Whenever the data in the activity changes, so does the text.
 *
 * **Creating bindings** — To create a binding, use the {@link Binding} constructor to bind a single property, use methods like {@link Binding.all()}, {@link Binding.any()}, or {@link Binding.none()} to combine bindings, or use the {@link Binding.fmt()} function to bind a string composed using a format string and one or more embedded bindings.
 *
 * **Applying bindings** — To use a binding, pass it to a UI view builder function, e.g. `UI.Text(v.bind("someText"))`. To apply a binding to any other observable object directly, use the {@link ObservableObject.observe()} method.
 *
 * **Adding transformations** — To convert the value of the original property, or to combine multiple bindings using boolean operations (and/or), use one of the Binding methods such as {@link Binding.map map()}, {@link Binding.all()}, and {@link Binding.any()}.
 */
export class Binding<T = any> {
	/**
	 * Creates a new binding using the provided binding, or a new binding that encapsulates the provided value
	 * @param value An existing binding, or a literal value
	 * @returns A new {@link Binding} object
	 */
	static from<T>(value: BindingOrValue<T>): Binding<T> {
		return isBinding(value) ? value.clone() : new Binding(undefined, value);
	}

	/**
	 * Creates a new binding that combines multiple bindings using AND semantics
	 * @summary Returns the last value if all values are truthy, otherwise returns the first falsy value. Returns true if no valid sources remain after filtering.
	 * @param sources One or more instances of {@link Binding} or source paths; undefined/null values are filtered out
	 * @returns A new {@link Binding} object
	 */
	static all<A extends Array<undefined | null | string | Binding<any>>>(
		...sources: A
	): Binding<A[number] extends Binding<infer T> ? T : any>;
	static all(
		...sources: Array<undefined | null | string | Binding<any>>
	): Binding<any> {
		let filtered = sources.filter((s): s is string | Binding => s != null);
		if (!filtered.length) return new Binding(undefined, true);
		return Binding.combine(filtered, (...values) => {
			for (let v of values) if (!v) return v;
			return values[values.length - 1];
		});
	}

	/**
	 * Creates a new binding that combines multiple bindings using OR semantics
	 * @summary Returns the first truthy value, or the last falsy value if none are truthy. Returns undefined if no valid sources remain after filtering.
	 * @param sources One or more instances of {@link Binding} or source paths; undefined/null values are filtered out
	 * @returns A new {@link Binding} object
	 */
	static any<A extends Array<undefined | null | string | Binding<any>>>(
		...sources: A
	): Binding<A[number] extends Binding<infer T> ? T : any>;
	static any(
		...sources: Array<undefined | null | string | Binding<any>>
	): Binding<any> {
		let filtered = sources.filter((s): s is string | Binding => s != null);
		if (!filtered.length) return new Binding();
		return Binding.combine(
			filtered,
			(...values) => {
				for (let v of values) if (v) return v;
				return values[values.length - 1];
			},
			true,
		);
	}

	/**
	 * Creates a new binding that returns true if none of the combined bindings are truthy
	 * @summary Returns true only when all bindings are bound and none of the values are truthy. Returns true if no valid sources remain after filtering.
	 * @param sources One or more instances of {@link Binding} or source paths; undefined/null values are filtered out
	 * @returns A new {@link Binding} object
	 */
	static none(
		...sources: Array<undefined | null | string | Binding>
	): Binding<boolean> {
		let filtered = sources.filter((s): s is string | Binding => s != null);
		if (!filtered.length) return new Binding(undefined, true);
		return Binding.combine<boolean>(
			filtered,
			(...values) => !values.some((v) => v),
		);
	}

	/**
	 * Creates a new binding that returns true if all combined binding values are equal
	 * @summary Returns true only when all bindings are bound and all values are strictly equal to the first. Returns true if no valid sources remain after filtering.
	 * @param sources Two or more instances of {@link Binding} or source paths; undefined/null values are filtered out
	 * @returns A new {@link Binding} object
	 */
	static equal(
		...sources: Array<undefined | null | string | Binding>
	): Binding<boolean> {
		let filtered = sources.filter((s): s is string | Binding => s != null);
		if (!filtered.length) return new Binding(undefined, true);
		return Binding.combine<boolean>(filtered, (...values) =>
			values.every((v) => v === values[0]),
		);
	}

	/**
	 * Creates a new binding by combining multiple bindings into a single value.
	 * @summary The callback receives the latest values from all sources and returns the combined result.
	 * @param sources One or more bindings or source paths to combine
	 * @param callback Function that maps source values to the combined result
	 * @param allowPartial If true, the callback may run before all sources are bound
	 * @returns A new {@link Binding} object
	 */
	static combine<R>(
		sources: Array<string | Binding>,
		callback: (...values: any[]) => R,
		allowPartial?: boolean,
	): Binding<R> {
		let bindings = sources.map((s) => (isBinding(s) ? s : new Binding<any>(s)));
		let result = new Binding<R>();
		result[$_bind_apply] = function (target, update) {
			let n = bindings.length;
			let boundCount = 0;
			let values: any[] = new Array(n);
			let currentResult: any = NO_VALUE;
			for (let i = 0; i < n; i++) {
				let wasBound = false;
				bindings[i]![$_bind_apply](target, (value, isBound) => {
					values[i] = value;
					if (isBound && !wasBound) {
						wasBound = true;
						boundCount++;
					}
					if (!allowPartial && boundCount < n) return;
					let newValue = callback(...values);
					if (newValue !== currentResult) {
						currentResult = newValue;
						update(newValue, true);
					}
				});
			}
		};
		return result;
	}

	/**
	 * Creates a new binding that references a property of the provided object
	 * - If the property doesn't exist yet, it will be initialized as undefined.
	 * @param object The object to bind to
	 * @param propertyName The name of the property to observe
	 * @returns A new {@link Binding} object
	 */
	static observe<TObject extends ObservableObject, K extends keyof TObject>(
		object: TObject,
		propertyName: K,
	): Binding<TObject[K]> {
		if (!(propertyName in object)) (object as any)[propertyName] = undefined;
		return new Binding({ path: [propertyName], origin: object });
	}

	/**
	 * Creates a new binding for a string-formatted value
	 * @summary This function is used to create a new binding for a string-formatted value with further embedded bindings.
	 * @param format The format string, containing placeholders similar to {@link fmt()}
	 * @param args A list of associated bindings
	 * @returns A new {@link Binding} object
	 */
	static fmt(
		format: StringConvertible,
		...args: Binding[] | [{ [K: string]: Binding }]
	): Binding<DeferredString> {
		let base = new DeferredString(format);
		let obj = !isBinding(args[0]) ? args[0] : undefined;
		let bindings: Binding[];
		let formatCallback: (...values: any[]) => DeferredString;

		if (obj) {
			let keys = Object.keys(obj);
			bindings = keys.map((key) =>
				isBinding(obj[key]) ? obj[key] : new Binding(undefined, obj[key]!),
			);
			formatCallback = (...values) => {
				let valueObj: any = {};
				for (let i = 0; i < keys.length; i++) {
					valueObj[keys[i]!] = values[i];
				}
				return base.format(valueObj);
			};
		} else {
			bindings = (args as Binding[]).map((arg) => Binding.from(arg));
			formatCallback = (...values) => base.format(...values);
		}

		// shortcut if no interpolation arguments
		if (!bindings.length) {
			let result = new Binding<DeferredString>(undefined, base as any);
			result._label = "Binding.fmt(...)";
			return result;
		}

		let result = Binding.combine(bindings, formatCallback, true);
		result._label = "Binding.fmt(...)";
		return result;
	}

	/**
	 * Creates a new binding for given property and default value
	 * @param source The source path that's used for obtaining the bound value, another {@link Binding} to clone from, or an object with advanced options
	 * @param defaultValue An optional default value that's used when the bound value is undefined
	 */
	constructor(
		source?: string | symbol | Binding | Binding.Options,
		defaultValue?: T,
	) {
		// set and bind (to `this`) the bind and bind.not 'methods'
		this.bind = ((s: any) => this._bindProperty(s)) as any;
		this.bind.not = (s) => this._bindProperty(s).not();

		// shortcut if cloning existing binding
		if (isBinding(source)) {
			this._path = source._path;
			this._origin = source._origin;
			this._label = source._label;
			this[$_bind_apply] = source[$_bind_apply];
			return;
		}

		// initialize path and other properties
		if (!source || typeof source === "string") {
			this._path = source ? source.split(".") : [];
		} else if (typeof source === "symbol") {
			this._path = [source];
		} else {
			if (!Array.isArray(source.path)) throw invalidArgErr("source");
			defaultValue = source.default;
			this._origin = source.origin;
			this._path = [...source.path];
		}

		// set basic apply method (function bound to this instance)
		this[$_bind_apply] = !source
			? defaultValue !== undefined
				? (_, update) => update(defaultValue, false)
				: function () {}
			: function (target, update) {
					watchBinding(target, this._origin, this._path, (value, bound) =>
						update(value ?? defaultValue, bound),
					);
				};
	}

	/** Binding source path */
	private readonly _path: (string | number | symbol)[];

	/** Binding origin object, if any */
	private _origin?: ObservableObject;

	/** Optional label for toString(), copied during clone */
	private _label?: string;

	/**
	 * Creates a copy of this binding
	 * - This method is primarily used to be able to copy both plain bindings and string formatted bindings using the same method.
	 * @returns A new binding, with the same source path and type
	 */
	protected clone() {
		return new Binding(this);
	}

	/** Creates a new binding to observe the specified property from any (currently bound) object */
	declare readonly bind: Binding.BindProperty<T>;

	/**
	 * Transforms the bound value to a string, optionally using the specified format
	 * @param format A {@link fmt} format string to format the value, e.g. `Value: {}`, `{:.2f}`
	 * @returns A new binding, typed as a string
	 */
	string(format?: string): Binding<string> {
		return this.map((value) => fmt(format || "{}", value).toString());
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
	 * Transforms to a boolean, true if the bound value exactly equals one of the specified values
	 * @param values The literal value(s) to compare with
	 * @returns A new binding, typed as a boolean
	 */
	equals(...values: T[]): Binding<boolean> {
		if (values.length === 1) {
			let value = values[0];
			return this.map((v) => v === value);
		}
		return this.map((v) => values.includes(v));
	}

	/** @internal Typo/hallucination alias */
	eq(...values: any[]) {
		return this.equals(...values);
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
	 * Transforms to a boolean, true if the bound value is less than or equal to a literal value
	 * @param value The literal value to compare with
	 * @returns A new binding, typed as a boolean
	 */
	lte(value: number): Binding<boolean> {
		return this.map((v) => +v <= value);
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
	 * Transforms to a boolean, true if the bound value is greater than or equal to a literal value
	 * @param value The literal value to compare with
	 * @returns A new binding, typed as a boolean
	 */
	gte(value: number): Binding<boolean> {
		return this.map((v) => +v >= value);
	}

	/**
	 * Returns a description of this binding, including its original source path, if any.
	 * @returns The string description.
	 */
	toString() {
		return this._label || "Binding(" + this._path.join(".") + ")";
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

	/** Implementation of bind method */
	private _bindProperty(sourcePath: string) {
		let result = this.clone();
		let path = sourcePath.split(".");
		let _apply = this[$_bind_apply];
		result[$_bind_apply] = function (target, update) {
			// use a secondary binding to be rebound on the bound object value
			let b: BoundResult | undefined;
			_apply.call(this, target, (value, bound) => {
				if (value instanceof ObservableObject) {
					// rebind secondary binding now
					if (b) rebind(b, value);
					else b = watchBinding(target, value, path, update);
				} else if (value != null) {
					// clear secondary binding if needed
					if (b) rebind(b, undefined);

					// just update with current non-bound property value
					let v = value;
					let len = path.length;
					for (let i = 0; i < len; i++) {
						if (v == null) break;
						v = v[path[i]!];
					}
					update(v, bound);
				} else {
					// clear and set to undefined
					if (b) rebind(b, undefined);
					update(undefined, bound);
				}
			});
		};
		return result;
	}
}

Binding.prototype.isBinding = _isBinding;

export namespace Binding {
	/**
	 * Creates a new binding to observe the specified property from any (currently bound) object
	 * - This method creates a binding that observes both the original value, and (if the value is an object) a property or nested property. If the value is undefined or not an object, the bound value becomes undefined.
	 * @param sourcePath The source property path, as a string
	 * @returns A new binding, typed as the new value or undefined
	 */
	export interface BindProperty<T> {
		<K extends Binding.BoundPath<NonNullable<T>>>(
			sourcePath: K,
		): Binding<Binding.BoundPathValue<T, K>>;

		/**
		 * Creates a new binding to observe and negate the specified property from any (currently bound) object
		 * - This method creates a binding that observes both the original value, and (if the value is an object) a property or nested property. The bound value is negated and becomes false or true depending on the property value.
		 * @param sourcePath The source property path, as a string
		 * @returns A new binding, typed as a boolean value
		 */
		not<K extends Binding.BoundPath<NonNullable<T>>>(
			sourcePath: K,
		): Binding<boolean>;
	}

	/** Options that can be passed to the {@link Binding} constructor */
	export type Options = {
		/** The source property path, as an array */
		readonly path: (string | number | symbol)[];
		/** Default value, used when the bound value itself is undefined */
		readonly default?: any;
		/** The origin object to observe, if specified */
		readonly origin?: ObservableObject;
	};

	/** Type definition for a property path */
	export type BoundPath<T> = T extends object
		? {
				[K in Extract<keyof T, string>]: T[K] extends object | undefined
					? K | `${K}.${BoundPath2<T[K]>}`
					: K;
			}[Extract<keyof T, string>]
		: never;

	// repeat the above, to limit recursion depth to 3
	export type BoundPath2<T> = T extends object
		? {
				[K in Extract<keyof T, string>]: T[K] extends object | undefined
					? K | `${K}.${BoundPath3<T[K]>}`
					: K;
			}[Extract<keyof T, string>]
		: never;

	// repeat the above, to limit recursion depth to 3
	export type BoundPath3<T> = T extends object
		? {
				[K in Extract<keyof T, string>]: T[K] extends object | undefined
					? K | `${K}.${string}`
					: K;
			}[Extract<keyof T, string>]
		: never;

	/** Type definition for a property value, based on a property path */
	export type BoundPathValue<
		T,
		P extends string,
	> = P extends `${infer K}.${infer Rest}`
		? K extends keyof T
			? undefined extends T[K]
				? BoundPathValue<NonNullable<T[K]>, Rest & string> | undefined
				: BoundPathValue<NonNullable<T[K]>, Rest & string>
			: never
		: P extends keyof NonNullable<T>
			? undefined extends T
				? NonNullable<T>[P] | undefined
				: NonNullable<T>[P]
			: never;
}
