import {
	Activity,
	UIListView,
	UIListViewEvent,
	UIScrollView,
	UITextField,
	ViewEvent,
} from "talla-ui";
import { Search, SearchResult } from "./Search";
import { SearchView } from "./SearchView";
import { swapPageAsync } from "./swap";

export class SearchActivity extends Activity {
	static override View = SearchView;

	constructor() {
		super();
		this.setRenderMode("mount", { mountId: "docpage-search" });
		this.observeAsync("searchQuery", {
			update: async (query) => {
				if (this.loading) await this.loading;
				if (!(this.hasInput = !!query)) return;
				this.findViewContent(UIScrollView)[0]?.scrollToTop();
				this.results = this.search.query(query)?.getResults() || [];
			},
			debounce: 30,
		});
	}

	search = new Search();
	hasInput = false;
	loading?: Promise<void> = undefined;
	results?: SearchResult[] = undefined;
	searchQuery = "";

	clear() {
		let input = this.findViewContent(UITextField)[0];
		if (input) input.value = "";
	}

	protected override async afterActive(signal: AbortSignal) {
		this.loading = (async () => {
			await this.search.loadJsonAsync("/docs/en/search.json");
			if (!signal.aborted) this.loading = undefined;
		})();
	}

	protected onSearchInput(e: ViewEvent<UITextField>) {
		this.searchQuery = e.source.value || "";
	}

	protected async onClose() {
		document.body.className = "docpage";
		(document.activeElement as HTMLInputElement)?.blur();
	}

	protected onArrowDownOnInput() {
		let list = this.findViewContent(UIListView)[0];
		if (list) {
			list.lastFocusedIndex = 0;
			list.requestFocus();
		}
	}

	protected async onGoToFirstResult() {
		if (this.results?.length) {
			await swapPageAsync(this.results[0]!.url);
		}
	}

	protected async onGoToResult(e: UIListViewEvent<SearchResult>) {
		let item = e.data.listViewItem;
		if (item.url) await swapPageAsync(item.url);
	}
}
