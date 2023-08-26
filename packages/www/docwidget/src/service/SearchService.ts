import { ManagedService } from "typescene";
import { SearchState } from "./SearchState";

/** Search result entry */
export interface SearchResult {
  id: string;
  type: string;
  path: string;
}

/** Service that is used to load and run searches */
export default class SearchService extends ManagedService {
  name = "App.Search";

  loaded?: boolean;
  error?: string;

  /** Load data from JSON file and run tokenizer */
  async loadAsync() {
    try {
      // fetch and decompress data
      let res = await fetch("/assets/ref.json");
      let json = res.ok && (await res.json());
      if (!json) throw Error("Cannot load search data");
      let data = this._decompress(json.content)
        .split("+")
        .map((s) => s.split("|"));

      // tokenize all IDs and store references
      for (let r of data) {
        let id = r[0].replace(/\.$/, "");
        let s: SearchResult = { id, type: r[1], path: r[2] };
        s.id
          .split(/\W|(?=[A-Z][a-z])/)
          .filter((t) => !!t)
          .map((t) => "#" + t.toLowerCase())
          .forEach((t) => {
            (this._tokens[t] || (this._tokens[t] = [])).push(s);
          });
      }
      this.loaded = true;
      this.emitChange();
    } catch (err) {
      console.log(err);
      this.loaded = true;
      this.error = String(err);
      this.emitChange();
    }
  }

  /** Find search results for given input string */
  find(input: string, max?: number) {
    input = input
      .replace(/[A-Z][a-z]|[A-Z]\W|[A-Z]$/g, (s) => " " + s)
      .trim()
      .toLowerCase();
    this._search.search(input);
    return this._search.getResults(max);
  }

  /** Run given callback for each token */
  forEachToken(f: (token: string, results: SearchResult[]) => void) {
    for (let token in this._tokens) {
      f(token.slice(1), this._tokens[token]);
    }
  }

  /** Decompress incoming data using the reverse of the algorithm used by the `docgen` tool */
  private _decompress(str: string) {
    let w2: string[] = [];
    return str
      .replace(/\=/g, "|1+")
      .replace(/\!/g, "|2#0:2+")
      .replace(/\?/g, "|2#0:2+1")
      .replace(/\*/g, "|3#0:3:3+2.2")
      .replace(/(\d+)|\w+/g, (w, n) => {
        if (n) w = w2.splice(n, 1)[0];
        w2.unshift(w);
        return w;
      });
  }

  /** Search results grouped by token, prepended with `#` and all lowercase */
  private _tokens: { [token: string]: SearchResult[] } = {};

  /** Root search state */
  private _search = new SearchState(this);
}
