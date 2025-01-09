import { ManagedObject, ObjectReader } from "../base/index.js";

/**
 * A class that controls persisted object data
 *
 * @description
 * This class allows you to store serializable objects (i.e. objects with properties that are serializable as JSON), indexed using string keys. The data can be retrieved using the same keys, validated and read using the {@link ObjectReader} class.
 *
 * An instance of this class is available as `app.localData`. Where possible (e.g. on the web platform), data is persisted to the user's device or runtime environment. In that case, the persisted data can be retrieved after the app is closed and started again.
 *
 * If the platform does not support persistence, notably in the test handler, data is cleared each time the global application context is initialized (i.e. when calling `useTestContext()`).
 *
 * On any write (or clear) operation, the `LocalData` object emits a change event. If possible, the `key` property of the event data indicates which object has been modified.
 *
 * @see {@link ObjectReader}
 * @see {@link useWebContext}
 * @see {@link useTestContext}
 *
 * @example
 * // write user profile data
 * app.localData.write("profile", { fullName: "John Doe" });
 *
 * // ... later, read it back, if possible
 * let [profile, errors] = app.localData.read("profile", { fullName: { string: {} }});
 * if (profile) console.log(profile.fullName);
 */
export class LocalData extends ManagedObject {
	/**
	 * Read persisted data from the specified key using an object schema
	 * @param key The persisted key
	 * @param schema The validation schema to use while reading data using {@link ObjectReader}
	 * @returns A tuple containing either the data (object) that was read, or a set of errors for fields in the schema definition
	 */
	read<T extends ObjectReader.Schema>(key: string, schema: T) {
		return new ObjectReader(schema).readJSONString(this._obj?.[key] || "{}");
	}

	/**
	 * Write and persist the specified object
	 * @param key The key to persist the data to
	 * @param data The data to be persisted, must be serializable as JSON (or undefined)
	 */
	write(key: string, data?: Record<string, unknown>) {
		(this._obj ||= {})[key] = data && JSON.stringify(data);
		return this.emitChange(undefined, { key });
	}

	/** Clears all keys and objects from the persisted storage */
	clear() {
		this._obj = undefined;
		return this.emitChange();
	}

	/** A map of JSON strings that gets used by the default implementation (i.e. not persisted at all) */
	declare private _obj?: Record<string, string | undefined>;
}
