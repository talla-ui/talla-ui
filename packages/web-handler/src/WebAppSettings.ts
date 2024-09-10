import { AppSettings, ObjectReader } from "talla";
import { WebContextOptions } from "./WebContext";

/** Web platform specific implementation of `AppSettings`, not exposed as-is */
export class WebAppSettings extends AppSettings {
	constructor(options: WebContextOptions) {
		super();
		this._key = options.appSettingsKey;
		this._set(options.defaultAppSettings);
	}

	/** Implementation of `read` using local storage */
	override read<T extends ObjectReader.Schema>(
		schema: T,
	): ObjectReader.Result<T> {
		let str = localStorage.getItem(this._key) || "{}";
		return new ObjectReader(schema).readJSONString(str);
	}

	/** Implementation of `write` using local storage */
	override write(data: Record<string, unknown>): this {
		return this._set(undefined, data);
	}

	/** Clears all values from the local storage key */
	override clear() {
		localStorage.removeItem(this._key);
		return this;
	}

	/** Helper method to set defaults and/or new fields combined with existing ones */
	private _set(
		defaults?: Record<string, unknown>,
		overrides?: Record<string, unknown>,
	) {
		let current: any = {};
		try {
			current = JSON.parse(localStorage.getItem(this._key) || "{}");
		} catch {}
		let str = JSON.stringify({ ...defaults, ...current, ...overrides });
		localStorage.setItem(this._key, str);
		return this;
	}

	private _key: string;
}
