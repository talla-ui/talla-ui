import {
	app,
	UIListView,
	UITextField,
	Activity,
	ViewEvent,
} from "@desk-framework/frame-core";
import { swapPageAsync } from "./swap";
import { Search, SearchResult } from "./Search";
import SearchView from "./SearchView";

export class SearchActivity extends Activity {
	protected override createView() {
		return new SearchView();
	}

	search = new Search();
	hasInput = false;
	loading?: Promise<void> = undefined;
	results?: SearchResult[] = undefined;
	searchThrottle = app.scheduler.createQueue(
		"searchThrottle",
		false,
		(options) => {
			options.throttleDelay = 30;
		},
	);

	clear() {
		let input = this.findViewContent(UITextField)[0];
		if (input) input.value = "";
	}

	protected override async afterActiveAsync() {
		await super.afterActiveAsync();
		this.loading = (async () => {
			await this.search.loadJsonAsync("/docs/en/search.json");
			this.loading = undefined;
		})();
	}

	protected async onSearchInput(e: ViewEvent<UITextField>) {
		let searchText = e.source.value || "";
		if (this.loading) {
			await this.loading;
			searchText = e.source.value || "";
		}

		this.searchThrottle.addOrReplace("search", async () => {
			if (!(this.hasInput = !!searchText)) return;
			this.hasInput = true;
			let results = this.search.query(searchText)?.getResults() || [];
			this.results = results;
		});
	}

	protected async onClose() {
		document.body.className = "docpage";
		(document.activeElement as HTMLInputElement)?.blur();
	}

	protected async onEscapeKeyPress() {
		return this.onClose();
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

	protected async onGoToResult(e: UIListView.ItemEvent<SearchResult>) {
		if (e.delegate.item.url) {
			await swapPageAsync(e.delegate.item.url);
		}
	}
}
