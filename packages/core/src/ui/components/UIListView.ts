import { View, ViewBuilder, ViewEvent } from "../../app/index.js";
import {
	Binding,
	BindingOrValue,
	ObservedEvent,
	ObservedList,
	ObservedObject,
} from "../../object/index.js";
import { ERROR, err } from "../../errors.js";
import { UIColumn, UIContainer, UIRow } from "../containers/index.js";
import { UIComponent } from "./UIComponent.js";

const ASYNC_BATCH_SIZE = 100;
const DEFAULT_MAX_DELAY_COUNT = 100;

const defaultItemBuilder = UIRow.getViewBuilder({});
const defaultContainerBuilder = UIColumn.getViewBuilder({
	accessibleRole: "list",
});

// use this property for duck typing ObservedList instances
const ObservedList_take = ObservedList.prototype.take;

/** Label property used to filter bindings using $list */
const $_list_bind_label = Symbol("list");

/**
 * An object that can be used to create bindings for properties of the containing {@link UIListView.ItemControllerView} object
 * - The source object includes the `item` property that refers to the list item object, i.e. an element of the list passed to {@link UIListView}.
 * - Within a list item view, you can bind to properties of the list item object using e.g. `$list.string("item.name")`.
 */
export const $list = Binding.createFactory<`item.${string}` | "item">(
	$_list_bind_label,
);

/**
 * Type definition for an event that's emitted by a view within a {@link UIListView}
 * - This event type includes the list item value that's associated with the event source view, in the event data object.
 *
 * @example
 * // ... in an activity:
 * onDeleteItem(e: UIListViewEvent<MyItem>) {
 *   let item = e.data.listViewItem;
 *   if (!(item instanceof MyItem)) return;
 *   // ... do something with item (of type MyItem)
 * }
 *
 * onDeleteNestedItem(e: UIListViewEvent<MyItem>) {
 *   while (e && !(e.data.listViewItem instanceof MyItem)) e = e.inner;
 *   // ... same as above
 */
export type UIListViewEvent<T = unknown> = ObservedEvent<
	View,
	Record<string, unknown> & {
		/** The list item value that's associated with the event source view */
		listViewItem: T;
	}
>;

/**
 * A UI component that manages views for each item in a list of objects or values
 *
 * @description A list view creates and renders content based on a provided list data structure.
 *
 * @online_docs Refer to the online documentation for more documentation on using this UI element class.
 */
export class UIListView<
	TItem extends ObservedObject = ObservedObject,
> extends UIComponent {
	/** @internal Creates an observer that populates the list with the provided item body and book end */
	static createObserver(
		itemBuilder: ViewBuilder,
		bookEndBuilder?: ViewBuilder,
	) {
		// return a unique class for the provided views, to be attached
		return class PresetListObserver extends ObservedObject {
			constructor(public list: UIListView) {
				super();
				let doUpdate = this.doUpdateAsync.bind(this);
				new Binding("items.*").bindTo(this, doUpdate);
				new Binding("firstIndex").bindTo(this, doUpdate);
				new Binding("maxItems").bindTo(this, doUpdate);
				this.doUpdateAsync();
			}
			override beforeUnlink() {
				// when unlinked, always clear content to help GC
				this.list._contentMap?.clear();
			}
			async doUpdateAsync() {
				if (this._sync) return;
				this._sync = true;
				await Promise.resolve();
				this._sync = false;
				if (this._running) this._running.abort = true;
				this._running = { abort: false };
				this.list?._updateItems(itemBuilder, bookEndBuilder, this._running);
			}
			private _sync?: boolean;
			private _running?: { abort: boolean };
		};
	}

	/**
	 * Creates a new {@link ViewBuilder} instance for the current view class
	 * @see {@link View.getViewBuilder}
	 * @docgen {hide}
	 */
	static override getViewBuilder(
		preset: ViewBuilder.ExtendPreset<
			typeof View,
			UIListView,
			"firstIndex" | "maxItems" | "renderOptions"
		> & {
			/** List of objects, either an array, {@link ObservedList} object, or binding for either */
			items?: BindingOrValue<Iterable<any>>;
			/** Event that's emitted when list item views are rendered */
			onListItemsChange?: string;
		},
		itemBuilder: ViewBuilder = defaultItemBuilder,
		containerBuilder: ViewBuilder = defaultContainerBuilder,
		bookEndBuilder?: ViewBuilder,
	) {
		let Observer = this.createObserver(itemBuilder, bookEndBuilder);
		let b = super.getViewBuilder(preset) as ViewBuilder<UIListView>;
		return b.addInitializer((list) => {
			list.attach(new Observer(list));
			list.createView = () => containerBuilder?.create();
		});
	}

	/** Creates a new list view object */
	constructor() {
		super();
		let list: ObservedList | undefined;
		Object.defineProperty(this, "items", {
			configurable: true,
			enumerable: true,
			get(this: UIListView) {
				return list;
			},
			set(this: UIListView, v: any) {
				list = this._makeList(v);
			},
		});
	}

	/**
	 * The list of objects, from which each object is used to construct one view object
	 * - This property should be set or bound to an {@link ObservedList} object or an array.
	 * - When set to an array, the property setter _converts_ the array to an {@link ObservedList} automatically, and uses that instead.
	 * - When updated, a {@link UIListView.ItemControllerView} view instance is created for each list item and added to the {@link UIComponent.body} container.
	 */
	declare items?: ObservedList<TItem>;

	/**
	 * Render options, including asynchronous and delayed rendering
	 * - These options can be used for staggered animation, or to avoid blocking other parts of the UI while rendering lists with many items all in one go.
	 */
	renderOptions?: UIListView.RenderOptions;

	/**
	 * Index of first item to be shown in the list
	 * - This property can be used for e.g. pagination, or sliding window positioning.
	 * - This property defaults to 0
	 */
	firstIndex = 0;

	/**
	 * The maximum number of items to be shown in the list
	 * - This property can be used for e.g. pagination, or sliding window positioning.
	 * - This property defaults to undefined to show all items in the list.
	 */
	maxItems?: number = undefined;

	/** The index of the last focused list item view, if any */
	lastFocusedIndex = 0;

	/**
	 * Returns the list index of the specified view, or of its parent(s)
	 * - If the specified view object is (currently) not contained within the list container, this method returns -1.
	 */
	getIndexOfView(view?: ObservedObject) {
		let content = this.getContent();
		if (!content) return -1;
		while (view && ObservedObject.whence(view) !== content) {
			view = ObservedObject.whence(view);
		}
		if (view) return content.indexOf(view as any);
		return -1;
	}

	/** Returns the current content of the list item view container (an observed list of views), if any */
	getContent() {
		return this.body instanceof UIContainer ? this.body.content : undefined;
	}

	/** Requests input focus on the last-focused list view object, or the first one, if possible */
	override requestFocus() {
		// pass on to last focused view (or first)
		let content = this.getContent();
		if (content && content.count > 0) {
			let lastFocusedIdx = Math.max(this.lastFocusedIndex, 0);
			let index = Math.min(content.count - 1, lastFocusedIdx);
			let goFocus: any = content.get(index);
			if (typeof goFocus.requestFocus === "function") goFocus.requestFocus();
		}
		return this;
	}

	/**
	 * Requests input focus on the view object _before_ the last focused item
	 * @returns True if a view object to focus is found; false if the last focused item is already the first item in the list, or if there are no items in the list
	 */
	focusPreviousItem() {
		if (this.lastFocusedIndex > 0) {
			this.lastFocusedIndex--;
			this.requestFocus();
			return true;
		}
		return false;
	}

	/**
	 * Requests input focus on the view object _after_ the last focused item
	 * @returns True if a view object to focus is found; false if the last focused item is already the last item in the list, or if there are no items in the list
	 */
	focusNextItem() {
		let lastIndex = this.items ? this.items.count - 1 : -1;
		if (this.maxItems !== undefined) {
			lastIndex = Math.min(lastIndex, this.maxItems - 1);
		}
		if (this.lastFocusedIndex < lastIndex) {
			this.lastFocusedIndex++;
			this.requestFocus();
			return true;
		}
		return false;
	}

	/**
	 * Event handler that focuses the next list item when a FocusNext event is emitted within the view
	 * - If there is no next list item, the event is propagated, potentially moving focus on a parent list view.
	 */
	onFocusNext() {
		if (this.focusNextItem()) return true;
	}

	/**
	 * Event handler that focuses the previous list item when a FocusPrevious event is emitted within the view
	 * - If there is no previous list item, and a parent list view exists, the parent list is focused instead; potentially focusing its previously focused item (the parent item, in a tree structure).
	 */
	onFocusPrevious() {
		if (this.focusPreviousItem()) return true;

		// or try to focus the parent list, don't delegate if so
		let parentList = UIListView.whence(this);
		if (parentList) {
			parentList.requestFocus();
			return true;
		}
	}

	/**
	 * Event handler that handles list item focus
	 * - If the focused element is the list body view itself, the last focused item view is focused instead.
	 * - Otherwise, the index of the focused item is stored in {@link lastFocusedIndex}, which is used by {@link requestFocus()}.
	 */
	onFocusIn(event: ViewEvent) {
		if (event.source === this.body) {
			// focus last focused item or first item instead of container
			this.requestFocus();
		} else {
			// store new focus index (if directly focused content)
			let controller = UIListView.ItemControllerView.whence(event.source);
			let content = this.getContent();
			let idx = controller && content?.indexOf(controller);
			this.lastFocusedIndex = idx ? Math.max(0, idx) : 0;
		}
	}

	/** Update the container with (existing or new) views, one for each list item; only called from list observer */
	private async _updateItems(
		itemBuilder: ViewBuilder,
		bookEndBuilder?: ViewBuilder,
		cancel?: { abort?: boolean },
	) {
		if (this.isUnlinked()) return;

		// use entire list, or just a part of it
		let firstIndex = this.firstIndex;
		if (!(firstIndex >= 0)) firstIndex = 0;
		let maxItems = this.maxItems;
		let list = this.items;
		let items =
			list instanceof ObservedList &&
			(firstIndex > 0 || maxItems! >= 0
				? list.count > 0 && firstIndex < list.count
					? list.take(
							maxItems! >= 0 ? maxItems! : list.count,
							list.get(firstIndex),
						)
					: undefined
				: list);

		// update the container's content, if possible
		let content = this.getContent();
		if (!content || !items) {
			this._contentMap && this._contentMap.clear();
			this._contentMap = undefined;
			content && content.clear();
			return;
		}

		// keep track of existing view instances for each object
		let existing = this._contentMap;
		let map = new Map<ObservedObject, UIListView.ItemControllerView<TItem>>();
		let views: View[] = [];
		let { async, delayEach, maxDelayCount } = this.renderOptions || {};
		if (delayEach) async = true;
		if (!maxDelayCount) maxDelayCount = DEFAULT_MAX_DELAY_COUNT;
		let n = 0;
		for (let item of items) {
			let v =
				existing?.get(item) ||
				new UIListView.ItemControllerView(item, itemBuilder);
			views.push(v);
			map.set(item, v);
			if (async) {
				if (cancel?.abort) return;
				let timeout = delayEach || 0;
				if (
					(delayEach && n < maxDelayCount) ||
					views.length % ASYNC_BATCH_SIZE === 0
				) {
					content.replaceAll(views);
					await new Promise((r) => setTimeout(r, timeout));
				}
			}
			n++;
		}
		if (bookEndBuilder) {
			if (!this._lastBookEnd || content.last() !== this._lastBookEnd) {
				this._lastBookEnd = bookEndBuilder.create();
			}
			views.push(this._lastBookEnd);
		}
		this._contentMap = map;
		if (cancel?.abort) return;
		content.replaceAll(views);

		// emit an event specific to this UIList
		this.emit("ListItemsChange");
	}

	/** Helper function to turn any iterable into an observed list if needed */
	private _makeList(v?: Iterable<any>) {
		if (v == null) return undefined;
		if ("take" in v && v.take === ObservedList_take) return v as ObservedList;
		if (!(Symbol.iterator in v)) throw err(ERROR.UIList_Invalid);
		let items = [...v];
		return new ObservedList(
			...items.map((it) =>
				it instanceof ObservedObject ? it : new UIListView.ItemValueWrapper(it),
			),
		);
	}

	/** Map of already-created content views */
	private _contentMap?: Map<
		ObservedObject,
		UIListView.ItemControllerView<TItem>
	>;

	/** Book end view that's already created, if any */
	private _lastBookEnd?: View;
}

export namespace UIListView {
	/**
	 * An object that contains options for (asynchronous) list rendering
	 * - Set `async` to true to enable asynchronous rendering.
	 * - Set `delayEach` to a number of milliseconds, to delay rendering eah consecutive item in the list.
	 * - Set `maxDelayCount` to the maximum number of items to render with delay (to avoid taking too long to render a long list)
	 */
	export type RenderOptions = {
		/** Set to true to enable asynchronous rendering */
		async?: boolean;
		/** Set to a number of milliseconds to delay rendering each consecutive item in the list */
		delayEach?: number;
		/** The maximum number of items to render with delay (to avoid taking too long to render a long list) */
		maxDelayCount?: number;
	};

	/**
	 * @internal An observed object class containing a single list item value
	 * @see {@link UIListView}
	 * @see {@link UIListView.ItemControllerView}
	 */
	export class ItemValueWrapper<TValue> extends ObservedObject {
		/**
		 * Creates a new wrapper object
		 * - This constructor is used by {@link UIListView} and should not be used from an application.
		 */
		constructor(value: TValue) {
			super();
			this.value = value;
		}

		/** The array item */
		value: TValue;
	}

	/**
	 * A view that's created automatically for each list item by {@link UIListView}
	 * @see {@link UIListView}
	 */
	export class ItemControllerView<TItem> extends UIComponent {
		/**
		 * Creates a new item controller view object
		 * - This constructor is used by {@link UIListView} and should not be used directly by an application.
		 * @hideconstructor
		 */
		constructor(item: any, body: ViewBuilder) {
			super();
			this.item = item instanceof ItemValueWrapper ? item.value : item;
			this.createView = () => body.create();
		}

		override delegate(event: ObservedEvent): true {
			this.emit(
				new ObservedEvent(
					event.name,
					event.source,
					{ ...event.data, listViewItem: this.item },
					this,
					event,
				),
			);
			return true;
		}

		/** @internal */
		[$_list_bind_label] = true;

		/** The encapsulated list (or array) item */
		readonly item: TItem;
	}
}
