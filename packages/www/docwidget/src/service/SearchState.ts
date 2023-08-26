import SearchService, { SearchResult } from "./SearchService";

/** Captured state for a partial search, used by `SearchService` */
export class SearchState {
  /** Create a new state instance, using given service and previous set of candidates */
  constructor(
    public readonly service: SearchService,
    public readonly candidates?: SearchResult[]
  ) {}

  /** Perform a partial search for given input (MUST be lowercase, tokens separated using spaces); returns the state itself */
  search(remainder: string) {
    remainder = remainder.replace(/^[\s\.]+/, "").replace(/[\s\.]+$/, "");
    this._lastInput = remainder;

    // remember old results and follow states, clear new ones
    let oldResults = this._results;
    let oldFollow = this._follow;
    this._results = {};
    this._follow = {};

    // find first input token, do nothing if blank
    let inputEnd = Math.max(remainder.indexOf(" "), remainder.indexOf("."));
    let p = inputEnd >= 0 ? remainder.slice(0, inputEnd) : remainder;
    if (!p.length) return this;

    // go through all tokens in the set and check for matches
    let concatPartTokens = "$";
    let partFollowResults: SearchResult[] = [];
    this.service.forEachToken((token, results) => {
      let ht = "#" + token;
      if (p.length <= token.length) {
        if (token.indexOf(p) === 0) {
          if (inputEnd < 0) {
            // add results, no need to keep searching
            this._results[ht] = oldResults[ht] || this._merge(results);
          } else {
            // add partial results to combined list
            concatPartTokens += token;
            partFollowResults.push(...results);
          }
        }
      } else if (p.startsWith(token)) {
        // complete match at beginning of input
        this._follow[ht] = (
          oldFollow[ht] || new SearchState(this.service, this._merge(results))
        ).search(remainder.slice(token.length));
      }
    });

    // handle combined list of 'partial match' tokens
    if (inputEnd >= 0) {
      this._follow[concatPartTokens] = (
        oldFollow[concatPartTokens] ||
        new SearchState(this.service, this._merge(partFollowResults))
      ).search(remainder.slice(inputEnd));
    }
    return this;
  }

  /** Return sorted results for the last search */
  getResults(max = 12) {
    let result: SearchResult[] = [];
    if (!this._lastInput) return result;

    // calculate a score for each match using last input string
    let score: { [id: string]: number } = {};
    let exact = this._lastInput.replace(/\s/g, "");
    for (let r of this._getAllResults()) {
      if (r.id in score) continue;
      let idx = r.id.toLowerCase().indexOf(exact);
      let points = r.type === "class" || r.type === "interface" ? 120 : 100;
      if (idx) points -= r.id.length;
      if (idx >= 0) {
        // give a bonus to 'fuller' matches
        points += 400;
        if (idx) points -= r.id[idx - 1] !== "." ? 100 : 50;
        let lenAfter = r.id.length - (idx + exact.length);
        if (lenAfter) points -= Math.min(100, lenAfter * 10);
      } else if (r.id.indexOf(".", idx + exact.length) > 0) {
        // penalize properties to be ordered below their parents
        points -= 20;
      }
      score[r.id] = points;
      result.push(r);
    }

    // sort results by score, then name
    result.sort((a, b) => {
      let diff = score[b.id] - score[a.id];
      return diff ? diff : a.id > b.id ? 1 : -1;
    });
    return result.slice(0, max);
  }

  /** Return all results for the last search, not deduped or sorted */
  private _getAllResults() {
    let result: SearchResult[] = [];
    for (let token in this._results) {
      result.push(...this._results[token]);
    }
    for (let token in this._follow) {
      result.push(...this._follow[token]._getAllResults());
    }
    return result;
  }

  /** Return results that overlap with current candidates, if any */
  private _merge(results: SearchResult[]) {
    if (!this.candidates) return results.slice();
    let considering: any = {};
    for (let r of results) {
      considering[r.id] = 1;
    }
    for (let r of this.candidates) {
      if (considering[r.id]) considering[r.id] = 2;
    }
    return results.filter((r) => considering[r.id] > 1);
  }

  /** Last input string */
  private _lastInput?: string;

  /** Partial results from all matching tokens */
  private _results: { [token: string]: SearchResult[] } = {};

  /** Follow states for all matching tokens */
  private _follow: { [token: string]: SearchState } = {};
}
