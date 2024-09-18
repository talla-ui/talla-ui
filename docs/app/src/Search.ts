import { ManagedObject } from "talla-ui";

export class SearchResult extends ManagedObject {
	constructor(
		public id: string,
		public title: string,
		public abstract: string,
		public url: string,
	) {
		super();
		this.lcId = id.toLowerCase();
		this.boost -= id.length;
		this.baseId = id.replace(/\w+$/, "").replace(/[._]+$/, "");

		// determine if should show ID separately (e.g. class methods)
		if (title.indexOf(id) < 0 && id.indexOf(".") >= 0) {
			this.showId = id;
		}
	}

	boost = 0;
	showId = "";
	lcId: string;
	baseId: string;
}

export class Search {
	index: SearchResult[] = [];

	async loadJsonAsync(url: string) {
		// TODO: use ObjectReader
		let request = await fetch(url);
		let json = request.ok ? await request.json() : undefined;
		if (Array.isArray(json)) {
			for (let it of json) {
				let [id, urlId, title, abstract] = it;
				if (urlId === "index") continue;
				this.index.push(new SearchResult(id, title, abstract, urlId + ".html"));
			}
			this._baseQuery = new Query("", this.index);
		}
	}

	query(s: string) {
		s = String(s).toLowerCase();
		if (!/\w/.test(s)) return;
		let query =
			this._lastQuery && s.indexOf(this._lastQuery.filter) >= 0
				? this._lastQuery
				: this._baseQuery;
		if (query?.filter === s) return query;
		return query.refine(s);
	}

	private _lastQuery?: Query;
	private _baseQuery = new Query("");
}

export class Query {
	constructor(
		public readonly filter: string,
		index?: SearchResult[],
	) {
		this._results = index ? index.slice() : [];
	}

	getResults() {
		let results = (this._results || []).slice();
		let seen: any = {};
		for (let i = 0; i < results.length; i++) {
			let it = results[i]!;
			if (seen[it.baseId]) {
				results.splice(i--, 1);
				continue;
			}
			seen[it.id] = true;
		}
		return results;
	}

	refine(lcSearch: string) {
		let result = new Query(lcSearch);
		let parts = lcSearch.split(/[\. ]+/);
		let index =
			this._results?.filter((it) =>
				parts.every((p) => it.lcId.indexOf(p) >= 0),
			) || [];
		index.sort((a, b) => {
			let a0 = parts.reduce(
				(cur, p) => cur + this._pointsFor(a, lcSearch, p),
				0,
			);
			let b0 = parts.reduce(
				(cur, p) => cur + this._pointsFor(b, lcSearch, p),
				0,
			);
			if (a.lcId.indexOf(lcSearch) === 0) a0 += 100;
			if (b.lcId.indexOf(lcSearch) === 0) b0 += 100;
			return b0 - a0;
		});
		result._results = index;
		return result;
	}

	private _pointsFor(it: SearchResult, lcSearch: string, part: string) {
		let boost = it.boost;
		if (!it.abstract) boost -= 10000;
		if (it.id === part) return 5000 + boost;
		let cap = part[0] ? part[0].toUpperCase() + part.slice(1) : "";
		return (
			boost +
			(it.id.startsWith(cap)
				? 1200
				: it.id.endsWith("." + part)
					? 1000
					: it.lcId.startsWith(part)
						? 800
						: it.lcId.indexOf(" " + part) > 0
							? 400
							: it.lcId.indexOf("_" + part) > 0
								? 400
								: it.lcId.indexOf("." + part) > 0
									? 200
									: it.id.indexOf(cap) > 0
										? 100
										: 0) +
			(it.lcId.startsWith(lcSearch)
				? 1000
				: /^(class|interface|type) /.test(it.title)
					? 500
					: 0)
		);
	}

	private _results?: SearchResult[];
}
