import { InputValidator } from "@talla-ui/util";
import { ObservableObject } from "../object/index.js";

/**
 * A class that controls persisted data
 *
 * @description
 * This class allows you to store serializable values (e.g. objects with properties that are serializable as JSON),. The data can be retrieved using the same keys, validated and read using the {@link InputValidator} class.
 *
 * An instance of this class is available as `app.localData`. Where possible (e.g. on the web platform), data is persisted to the user's device or runtime environment. In that case, the persisted data can be retrieved after the app is closed and started again.
 *
 * If the platform does not support persistence, notably in the test handler, data is cleared each time the global application context is initialized (i.e. when calling `useTestContext()`).
 *
 * On any write (or clear) operation, the `LocalData` object emits a change event. If possible, the `key` property of the event data indicates which object has been modified.
 *
 * @see {@link InputValidator}
 * @see {@link useWebContext}
 * @see {@link useTestContext}
 * @hideconstructor
 *
 * @example
 * // write user profile data
 * await app.localData.writeAsync("profile", { fullName: "John Doe" });
 *
 * // ... later, read it back, if possible
 * let { data, errors } = await app.localData.readAsync("profile", (v) =>
 *   v.object({ fullName: v.string().optional() })
 * );
 * if (data) console.log(data.fullName);
 */
export class LocalData extends ObservableObject {
	constructor(defaults?: Record<string, unknown>) {
		super();
		this._defaults = { ...defaults };
	}

	/**
	 * Read persisted data from the specified key using an input validator
	 * @param key The persisted key
	 * @param validator Either an {@link InputValidator} instance or callback to create one
	 * @returns A tuple containing either the data that was read, or a set of errors for fields in the schema definition
	 */
	async readAsync<T = unknown>(
		key: string,
		validator: InputValidator.Initializer<T>,
	) {
		validator = new InputValidator(validator);
		let json = this._obj?.[key];
		return json
			? validator.safeParse(JSON.parse(json))
			: validator.safeParse(this._defaults[key] || ({} as any));
	}

	/**
	 * Write and persist the specified data
	 * @param key The key to persist the data to
	 * @param data The data to be persisted, must be serializable as JSON (or undefined)
	 */
	async writeAsync(key: string, data?: unknown) {
		(this._obj ||= {})[key] = data == null ? undefined : JSON.stringify(data);
		return this.emitChange(undefined, { key });
	}

	/** Clears all keys and objects from the persisted storage */
	async clearAsync() {
		this._obj = undefined;
		return this.emitChange();
	}

	/** A map of JSON strings that gets used by the default implementation (i.e. not persisted at all) */
	declare private _obj?: Record<string, string | undefined>;

	private _defaults: Record<string, unknown>;
}
