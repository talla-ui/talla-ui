import {
  ActionEvent,
  DialogViewActivity,
  managedChild,
  ManagedList,
  ManagedRecord,
  rateLimit,
  service,
  UICell,
  UIComponentEvent,
  UIListCellAdapterEvent,
  UIRenderPlacement,
  UITextField,
} from "typescene";
import SearchService, { SearchResult } from "../service/SearchService";
import view from "./view";

export default class WidgetActivity extends DialogViewActivity.with(view) {
  placement = UIRenderPlacement.DIALOG;

  filter?: string;

  @managedChild
  filtered = new ManagedList<SearchResult & ManagedRecord>();

  @service("App.Search")
  search?: SearchService;

  close() {
    this.getApplication()!.deactivateAsync();
  }

  onCloseModal() {
    // deactivate the app instead of destroying this activity
    this.close();
    return true;
  }

  updateFiltered() {
    let result = this.search!.find(this.filter || "");
    this.filtered.replace(
      result.map((r) => {
        for (let existing of this.filtered) {
          if (existing.id === r.id && existing.type === r.type) {
            return existing;
          }
        }
        return ManagedRecord.create(r);
      })
    );
  }

  onSetSearchFilter(e: ActionEvent<UITextField>) {
    this.filter = e.source.value || "";
  }

  onFocusFirst(e: ActionEvent) {
    let cell = e.source.getParentComponent(UICell);
    if (cell) cell.requestFocusNext();
  }

  onNavigateFirst() {
    let first = this.filtered.first();
    if (first) {
      this.close();
      document.location.href = "/docs/ref/" + first.path;
    }
  }

  onNavigateResult(e: UIListCellAdapterEvent<SearchResult & ManagedRecord>) {
    if (e.object && e.object.path) {
      this.close();
      document.location.href = "/docs/ref/" + e.object.path;
    }
  }

  onGoIndex() {
    this.close();
    document.location.href = "/docs";
  }

  onIgnoreArrowPress(e: ActionEvent) {
    if (e.inner instanceof UIComponentEvent) {
      (e.inner.event as KeyboardEvent).preventDefault();
    }
  }
}

// use an observer to update on change (async, rate limited)
class Observer {
  constructor(public readonly activity: WidgetActivity) {}
  @rateLimit(80)
  onFilterChangeAsync() {
    this.activity.updateFiltered();
  }
}
WidgetActivity.addObserver(Observer);
