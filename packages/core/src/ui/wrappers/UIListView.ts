import { View, ViewBuilder, CustomView, ViewEvent } from "../../app/index.js";
import {
	BindingOrValue,
	ObservableEvent,
	ObservableList,
	ObservableObject,
} from "../../object/index.js";
import { ERROR, err, safeCall } from "../../errors.js";
import {
	UIColumn,
	UIRow,
	UIContainer,
	UIScrollView,
} from "../containers/index.js";
import { UISpacer } from "../controls/UISpacer.js";

const ASYNC_BATCH_SIZE = 100;
const DEFAULT_MAX_DELAY_COUNT = 100;

// use this property for duck typing ObservableList instances
const ObservableList_take = ObservableList.prototype.take;

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
export type UIListViewEvent<T = unknown> = ObservableEvent<
	View,
	Record<string, unknown> & {
		/** The list item value that's associated with the event source view */
		listViewItem: T;
	}
>;

/**
 * A view wrapper that manages nested views for each item in a list
 *
 * @description A list view creates and renders content within a container, based on items from a provided list (either an array, or an {@link ObservableList} object).
 *
 * @online_docs Refer to the online documentation for more information on using this UI element class.
 */
export class UIListView<
	TItem extends ObservableObject = ObservableObject,
> extends CustomView {
	/** @internal Attaches a list observer instance to the list, updating its content when the list changes */
	static initializeBuild(
		instance: UIListView,
		contentBuilder: ViewBuilder,
		itemBuilder: ViewBuilder,
		emptyStateBuilder?: ViewBuilder,
	) {
		function setRole(content?: View) {
			if (content instanceof UIScrollView) {
				setRole(content.content.first());
			} else if (content instanceof UIContainer) {
				content.accessibleRole ||= "list";
			}
			return content;
		}
		let sync = false;
		let running: { abort?: boolean } | undefined;
		async function doUpdateAsync() {
			if (sync) return;
			sync = true;
			await Promise.resolve();
			sync = false;
			if (running) running.abort = true;
			running = { abort: false };
			instance._updateItems(itemBuilder, emptyStateBuilder, running);
		}
		instance.createViewBody = () => setRole(contentBuilder.create());
		instance.observe("items", doUpdateAsync);
		instance.observe("firstIndex", doUpdateAsync);
		instance.observe("maxItems", doUpdateAsync);
		safeCall(doUpdateAsync);
	}

	/** Creates a new list view object */
	constructor() {
		super();
		let list: ObservableList | undefined;
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
	 * - This property should be set or bound to an {@link ObservableList} object or an array.
	 * - When set to an array, the property setter _converts_ the array to an {@link ObservableList} automatically, and uses that instead.
	 * - When updated, a {@link UIListView.ItemControllerView} view instance is created for each list item and added to the {@link body} container.
	 */
	declare items?: ObservableList<TItem>;

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

	/**
	 * True if a spacer should be added after the last list item view
	 * - If set, and the list is not empty, a spacer view is added at the end of the list. This can be used to add a divider after the last list item, e.g. in a scroll view.
	 * - The spacer always has a minimum height and width of 0 pixels.
	 */
	addSpacer?: boolean;

	/** The index of the last focused list item view, if any */
	lastFocusedIndex = 0;

	/**
	 * Returns the list index of the specified view, or of its parent(s)
	 * - If the specified view object is (currently) not contained within the list container, this method returns -1.
	 */
	getIndexOfView(view?: ObservableObject) {
		let content = this.getContent();
		if (!content) return -1;
		while (view && ObservableObject.whence(view) !== content) {
			view = ObservableObject.whence(view);
		}
		if (view) return content.indexOf(view as any);
		return -1;
	}

	/**
	 * Returns the current content of the list item view container (an observable list of views), if any
	 * @note If the current body content is a scroll view, the content of the scroll view is returned instead. This allows the outer list container to be a scroll view.
	 */
	getContent() {
		let body = this.body;
		while (body instanceof UIScrollView) body = body.content.first();
		return body instanceof UIContainer ? body.content : undefined;
	}

	/** Requests input focus on the last-focused list view object, or the first one, if possible */
	override requestFocus() {
		// pass on to last focused view (or first)
		let content = this.getContent();
		if (content && content.length > 0) {
			let lastFocusedIdx = Math.max(this.lastFocusedIndex, 0);
			let index = Math.min(content.length - 1, lastFocusedIdx);
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
		let lastIndex = this.items ? this.items.length - 1 : -1;
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
	protected onFocusNext() {
		if (this.focusNextItem()) return true;
	}

	/**
	 * Event handler that focuses the previous list item when a FocusPrevious event is emitted within the view
	 * - If there is no previous list item, and a parent list view exists, the parent list is focused instead; potentially focusing its previously focused item (the parent item, in a tree structure).
	 */
	protected onFocusPrevious() {
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
	protected onFocusIn(event: ViewEvent) {
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

	/** Unlink handler, explicitly frees some resources for this list */
	protected override beforeUnlink() {
		this._contentMap?.clear();
		this._contentMap = undefined;
		this._lastEmptyState = undefined;
		this._lastSpacer = undefined;
	}

	/** Update the container with (existing or new) views, one for each list item; only called from list observer */
	private async _updateItems(
		itemBuilder: ViewBuilder<View>,
		emptyStateBuilder?: ViewBuilder<View>,
		cancel?: { abort?: boolean },
	) {
		if (this.isUnlinked()) return;

		// use entire list, or just a part of it
		let firstIndex = this.firstIndex;
		if (!(firstIndex >= 0)) firstIndex = 0;
		let maxItems = this.maxItems;
		let list = this.items;
		let items =
			list instanceof ObservableList &&
			(firstIndex > 0 || maxItems! >= 0
				? list.length > 0 && firstIndex < list.length
					? list.take(
							maxItems! >= 0 ? maxItems! : list.length,
							list.get(firstIndex),
						)
					: undefined
				: list);

		// update the container's content, if possible
		let content = this.getContent();
		if (!content || !items) {
			this._contentMap?.clear();
			this._contentMap = undefined;
			content?.replaceAll(
				emptyStateBuilder
					? [(this._lastEmptyState ||= emptyStateBuilder.create())]
					: [],
			);
			return;
		}

		// keep track of existing view instances for each object
		let existing = this._contentMap;
		let map = new Map<ObservableObject, UIListView.ItemControllerView<TItem>>();
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
		if (n && this.addSpacer) {
			let spacer = this._lastSpacer;
			if (!spacer) {
				this._lastSpacer = spacer = new UISpacer();
				spacer.style = { minHeight: 0, minWidth: 0, grow: true };
			}
			views.push(spacer);
		}
		if (!n && emptyStateBuilder) {
			views.push((this._lastEmptyState ||= emptyStateBuilder.create()));
		}
		this._contentMap = map;
		if (cancel?.abort) return;
		content.replaceAll(views);

		// emit an event specific to this UIList
		this.emit("ListItemsChange");
	}

	/** Helper function to turn any iterable into an observable list if needed */
	private _makeList(v?: Iterable<any>) {
		if (v == null) return undefined;
		if ("take" in v && v.take === ObservableList_take)
			return v as ObservableList;
		if (!(Symbol.iterator in v)) throw err(ERROR.UIList_Invalid);
		let items = [...v];
		return new ObservableList(
			...items.map((it) =>
				it instanceof ObservableObject
					? it
					: new UIListView.ItemValueWrapper(it),
			),
		);
	}

	/** Map of already-created content views */
	private _contentMap?: Map<
		ObservableObject,
		UIListView.ItemControllerView<TItem>
	>;

	/** Book end view that's already created, if any */
	private _lastEmptyState?: View;

	/** Spacer view that's already created, if any */
	private _lastSpacer?: UISpacer;
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
	 * @internal An observable object class containing a single list item value
	 * @see {@link UIListView}
	 * @see {@link UIListView.ItemControllerView}
	 */
	export class ItemValueWrapper<TValue> extends ObservableObject {
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
	 * - This view re-emits events with a `listViewItem` property (making it possible to type the event as `UIListViewEvent<TItem>`).
	 * - The {@link item} property refers to the list item object (which can be used to refer to the list item data with bindings).
	 * - The {@link getListItemView()} method returns the current view, i.e. the view body.
	 * @see {@link UIListView}
	 */
	export class ItemControllerView<TItem> extends CustomView {
		static {
			// Enable bindings on the `item` property, using bind("item") without a type parameter
			ItemControllerView.enableBindings();
		}

		/**
		 * Creates a new item controller view object
		 * - This constructor is used by {@link UIListView} and should not be used directly by an application.
		 * @hideconstructor
		 */
		constructor(item: any, body: ViewBuilder<View>) {
			super();
			this.item = item instanceof ItemValueWrapper ? item.value : item;
			this.createViewBody = () => body.create();
		}

		override delegate(event: ObservableEvent): true {
			this.emit(
				new ObservableEvent(
					event.name,
					event.source,
					{ ...event.data, listViewItem: this.item },
					this,
					event,
				),
			);
			return true;
		}

		/** Returns the current view, i.e. the view body */
		getListItemView() {
			return this.body;
		}

		/** The encapsulated list (or array) item */
		readonly item: TItem;
	}

	/**
	 * Creates a view builder for a list view wrapper
	 * @param items An iterable collection of items to display, or a binding to one.
	 * @param content Optional view builder that defines the template for each list item.
	 * @returns A builder object for configuring the list view.
	 * @see {@link UIListView}
	 */
	export function listBuilder(
		items: BindingOrValue<Iterable<any>>,
		content?: ViewBuilder<View>,
	) {
		return new ListBuilder().items(items).with(content);
	}

	/**
	 * A builder class for creating `UIListView` instances.
	 * - Objects of this type are returned by the `UI.List()` function.
	 */
	export class ListBuilder implements ViewBuilder<UIListView> {
		/** The initializer that is used to create each list view instance */
		readonly initializer = new ViewBuilder.Initializer(UIListView, (view) => {
			let contentBuilder = this._content || UIRow.rowBuilder();
			let containerBuilder = this._container || UIColumn.columnBuilder();
			UIListView.initializeBuild(
				view,
				containerBuilder,
				contentBuilder,
				this._emptyState,
			);
		});

		/**
		 * Creates a new instance of the UI list view.
		 * @returns A newly created and initialized `UIListView` instance.
		 */
		create() {
			return this.initializer.create();
		}

		/**
		 * Intercepts an event from the list view and re-emits it with a different name.
		 * @param origEvent The name of the event to intercept.
		 * @param emit The new event name to emit, or a function to call.
		 * @param data The data properties to add to the alias event, if any
		 * @param forward Whether to forward the original event as well (defaults to false)
		 * @returns The builder instance for chaining.
		 */
		intercept(
			origEvent: string,
			emit: string | ObservableObject.InterceptHandler<UIListView>,
			data?: Record<string, unknown>,
			forward?: boolean,
		) {
			this.initializer.intercept(origEvent, emit, data, forward);
			return this;
		}

		/**
		 * Sets the list of items to be displayed.
		 * @param items An iterable collection of items, or a binding to one.
		 * @returns The builder instance for chaining.
		 */
		items(items: BindingOrValue<Iterable<any>>) {
			this.initializer.set("items", items as any);
			return this;
		}

		/**
		 * Defines the view to be rendered for each item in the list.
		 * @param content A view builder that defines the template for each list item.
		 * @returns The builder instance for chaining.
		 */
		with(content?: ViewBuilder<View>) {
			this._content = content;
			return this;
		}

		/**
		 * Defines the outer container for the list items.
		 * - If this method is not called, the list items will be rendered in a plain column container.
		 * - You can pass a scroll view as the outer container, in which case the list items will be rendered _within_ the scroll view's content container.
		 * @param container A view builder for the outer container (e.g., `UI.Column()`, `UI.Row()`).
		 * @returns The builder instance for chaining.
		 */
		outer(container?: ViewBuilder<View>) {
			this._container = container;
			return this;
		}

		/**
		 * Defines an 'empty state' view to be shown when the list is empty.
		 * @param emptyState A view builder for the view to show when the list is empty.
		 * @returns The builder instance for chaining.
		 */
		emptyState(emptyState?: ViewBuilder<View>) {
			this._emptyState = emptyState;
			return this;
		}

		/**
		 * Sets whether a spacer (and a divider, if any) should be added after the last list item view.
		 * @param addSpacer True if a spacer should be added after the last list item view, defaults to true.
		 * @returns The builder instance for chaining.
		 */
		addSpacer(addSpacer: boolean = true) {
			this.initializer.set("addSpacer", addSpacer);
			return this;
		}

		/**
		 * Sets the display bounds for the list (e.g., for pagination).
		 * @param firstIndex The index of the first item to display. Defaults to 0.
		 * @param maxItems The maximum number of items to display.
		 * @returns The builder instance for chaining.
		 */
		bounds(
			firstIndex: BindingOrValue<number> = 0,
			maxItems?: BindingOrValue<number>,
		) {
			this.initializer.set("firstIndex", firstIndex);
			this.initializer.set("maxItems", maxItems);
			return this;
		}

		/**
		 * Sets the rendering options for the list, using {@link UIListView.renderOptions}.
		 * @param options An object with options for asynchronous rendering and delay.
		 * @returns The builder instance for chaining.
		 */
		renderOptions(options?: UIListView.RenderOptions) {
			this.initializer.set("renderOptions", options);
			return this;
		}

		private _container?: ViewBuilder<View>;
		private _content?: ViewBuilder<View>;
		private _emptyState?: ViewBuilder<View>;
	}
}
