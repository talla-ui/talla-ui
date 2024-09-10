import { ObjectReader } from "../base/index.js";

/**
 * A class that controls globally persisted settings data
 *
 * @description
 * An instance of this class is available as `app.settings`. Where possible (e.g. on the web platform), settings data is persisted globally. In that case, data that's written to a settings field can be retrieved after the app is closed and started again.
 *
 * If the platform does not support persisted settings, notably in the test handler, data is cleared each time the global application context is initialized (i.e. when calling `useTestContext()`).
 *
 * Settings data must be serializable, i.e. field data must be made up of strings, numbers, booleans, dates, objects, and arrays, as handled by the {@link ObjectReader} class.
 *
 * @see {@link ObjectReader}
 * @see {@link useWebContext}
 * @see {@link useTestContext}
 *
 * @example
 * // write settings data as a string
 * app.settings.write({ fullName: "John Doe" });
 *
 * // ... later, read it back as a string, if possible
 * let [settings, errors] = app.settings.read({ fullName: { string: {} }});
 * if (settings) console.log(settings.fullName);
 */
export class AppSettings {
	/**
	 * Read persisted settings data using the specified schema
	 * @param schema The validation schema to use while reading data using {@link ObjectReader}
	 * @returns A tuple containing either the data that was read, or a set of errors for fields in the schema definition
	 */
	read<T extends ObjectReader.Schema>(schema: T) {
		return new ObjectReader(schema).readJSONString(this._json || "{}");
	}

	/**
	 * Write and persist the fields contained by the given object
	 * @param data The data to be persisted, must be serializable
	 */
	write(data: Record<string, unknown>) {
		// this method is overridden by platform specific code; just save to a private member here
		this._json = JSON.stringify({ ...JSON.parse(this._json || "{}"), ...data });
		return this;
	}

	/** Clears all data from the persisted settings storage */
	clear() {
		this._json = undefined;
		return this;
	}

	/** JSON object data structure that gets used by the default implementation without any persistence */
	private _json?: string;
}
