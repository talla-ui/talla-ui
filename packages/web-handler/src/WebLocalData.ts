import { LocalData, ObjectReader } from "@talla-ui/core";
import { WebContextOptions } from "./WebContext.js";

/** @internal Web platform specific implementation of `LocalData`, not exposed as-is */
export class WebLocalData extends LocalData {
	constructor(options?: WebContextOptions) {
		super(options?.defaultLocalData);
		this._name = options?.localDataName || "LocalData";
	}

	override async readAsync<T extends ObjectReader.Schema>(
		key: string,
		schema: T,
	) {
		let data = await this._transact((s) => s.get(String(key)));
		return data && data.value !== undefined
			? new ObjectReader(schema).read(data.value as any)
			: super.readAsync(key, schema);
	}

	override async writeAsync(key: string, value?: Record<string, unknown>) {
		await this._transact((s) => {
			if (value === undefined) s.delete(key);
			else s.put({ key, value });
		}, true);
		return this.emitChange(undefined, { key });
	}

	override async clearAsync() {
		await this._transact((s) => s.clear(), true);
		return this.emitChange();
	}

	private async _transact<R>(
		f: (s: IDBObjectStore) => ({ result?: R } & IDBRequest) | void,
		write?: boolean,
	): Promise<R> {
		if (!this._idb) {
			let openRequest = indexedDB.open(this._name);
			openRequest.onupgradeneeded = () => {
				openRequest.result.createObjectStore("data", { keyPath: "key" });
			};
			this._idb = this._p(openRequest);
		}
		let db = await this._idb;
		let tx = db.transaction("data", write ? "readwrite" : "readonly");
		return await this._p(f(tx.objectStore("data")) || tx, write);
	}

	private _p<R, T extends { result?: R } & (IDBRequest | IDBTransaction)>(
		r: T,
		onComplete?: boolean,
	): Promise<R> {
		return new Promise((resolve, reject) => {
			r.onerror = () => reject(r.error);
			(r as any)[onComplete ? "oncomplete" : "onsuccess"] = () =>
				resolve(r.result);
		});
	}

	private _name: string;
	private _idb?: Promise<IDBDatabase>;
}
