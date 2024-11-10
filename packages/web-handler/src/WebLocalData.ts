import { LocalData, ObjectReader } from "talla-ui";
import { WebContextOptions } from "./WebContext";

/** Web platform specific implementation of `LocalData`, not exposed as-is */
export class WebLocalData extends LocalData {
	constructor(options: WebContextOptions) {
		super();
		let prefix = (this._prefix = options.localDataPrefix);
		let defaults = options.defaultLocalData;
		if (defaults) {
			for (let k in defaults) {
				if (!localStorage.getItem(prefix + k)) this.write(k, defaults[k]);
			}
		}
	}

	/** Implementation of `read` using local storage */
	override read<T extends ObjectReader.Schema>(
		key: string,
		schema: T,
	): ObjectReader.ReadResult<T> {
		let str = localStorage.getItem(this._prefix + key) || "{}";
		return new ObjectReader(schema).readJSONString(str);
	}

	/** Implementation of `write` using local storage */
	override write(key: string, data?: Record<string, unknown>): this {
		key = this._prefix + key;
		if (data) localStorage.setItem(key, JSON.stringify(data));
		else localStorage.removeItem(key);
		return this.emitChange(undefined, { key });
	}

	/** Clears all (prefixed) keys from local storage */
	override clear() {
		for (let i = 0; i < localStorage.length; i++) {
			let key = localStorage.key(i)!;
			if (key.startsWith(this._prefix)) {
				localStorage.removeItem(key);
			}
		}
		return this.emitChange();
	}

	private _prefix: string;
}
