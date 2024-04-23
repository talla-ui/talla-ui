import { View, ViewClass, ViewComposite } from "../../app/index.js";
import {
	BindingOrValue,
	ManagedEvent,
	ManagedList,
	ManagedObject,
	bound,
} from "../../base/index.js";
import { ERROR, err } from "../../errors.js";
import { UIContainer } from "../containers/index.js";

/**
 * A view composite that manages views for each item in a list of objects or values
 *
 * @description A list component creates and renders content based on a provided list data structure.
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export class UIListView<
	TItem extends ManagedObject = ManagedObject,
> extends ViewComposite {
	/** @internal Creates an observer that populates the list with the provided item body and book end */
	static createObserver(ItemBody: ViewClass, BookEnd?: ViewClass) {
		// return a unique class for the provided views, to be attached
		return class PresetListObserver extends ManagedObject {
			constructor(public list: UIListView) {
				super();
				let doUpdate = this.doUpdateAsync.bind(this);
				bound("items.*").bindTo(this, doUpdate);
				bound("firstIndex").bindTo(this, doUpdate);
				bound("maxItems").bindTo(this, doUpdate);

				// create view already to avoid unnecessary async updates
				list.body = list.createView() as any;
				this.doUpdateAsync();
			}
			override beforeUnlink() {
				// when unlinked, always clear content to help GC
				this.list._contentMap?.clear();
			}
			async doUpdateAsync() {
				if (this._pending) return;
				this._pending = true;
				await Promise.resolve();
				this._pending = false;
				this.list?._updateItems(ItemBody, BookEnd);
			}
			private _pending?: boolean;
		};
	}

	/** Creates a new list view composite object */
	constructor() {
		super();
		let list: ManagedList | undefined;
		Object.defineProperty(this, "items", {
			configurable: true,
			enumerable: true,
			get(this: UIListView) {
				return list;
			},
			set(this: UIListView, v: any) {
				if (Array.isArray(v)) v = this._makeList(v);
				if (!(v instanceof ManagedList) && v != null) {
					throw err(ERROR.UIList_Invalid);
				}
				list = v;
			},
		});
	}

	/**
	 * Applies the provided preset properties to this object
	 * - This method is called automatically. Do not call this method after constructing an instance
	 */
	override applyViewPreset(
		preset: View.ViewPreset<
			ViewComposite,
			UIListView,
			"firstIndex" | "maxItems"
		> & {
			/** List of objects, either an array, {@link ManagedList} object, or binding for either */
			items?: BindingOrValue<Iterable<any>>;
			/** Event that's emitted when list item views are rendered */
			onListItemsChange?: string;
		},
	) {
		super.applyViewPreset(preset);
		if ((preset as any).Body) {
			let Body = (preset as any).Body as ViewClass<UIContainer>;
			this.createView = () => new Body();
			delete (preset as any).Body;
		}
		if ((preset as any).Observer) {
			this.attach(new (preset as any).Observer(this));
			delete (preset as any).Observer;
		}
	}

	/**
	 * The list of objects, from which each object is used to construct one view object
	 * - This property should be set or bound to a {@link ManagedList} object or an array.
	 * - When set to an array, the property setter _converts_ the array to a {@link ManagedList} automatically, and uses that instead.
	 * - When updated, a {@link UIListView.ItemControllerView} view instance is created for each list item and added to the {@link ViewComposite.body} container.
	 */
	declare items?: ManagedList<TItem>;

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
	getIndexOfView(view?: ManagedObject) {
		let content = this.getContent();
		if (!content) return -1;
		while (view && ManagedObject.whence(view) !== content) {
			view = ManagedObject.whence(view);
		}
		if (view) return content.indexOf(view as any);
		return -1;
	}

	/** Returns the current content of the list item view container (a managed list of views), if any */
	getContent() {
		return this.body instanceof UIContainer ? this.body.content : undefined;
	}

	/** Requests input focus on the last-focused list view object, or the first one, if possible */
	override requestFocus() {
		// pass on to last focused component (or first)
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
	 * Override of {@link ViewComposite.delegateViewEvent}
	 * - This method always emits the original event without updating the delegate property, since the delegate should refer to the list item view controller, not the list view itself.
	 * - This method also handles focus events to focus the _first list item_ instead of the list container; and handles `FocusPrevious` and `FocusNext` events to move focus within the list (or the parent list). No other events are handled.
	 */
	protected override delegateViewEvent(event: ManagedEvent): boolean {
		switch (event.name) {
			case "FocusNext":
				// try to focus the next element in the list
				if (this.focusNextItem()) return true;
				break;
			case "FocusPrevious":
				// try to focus the previous element in the list
				if (this.focusPreviousItem()) return true;

				// or try to focus the parent list, don't delegate if so
				let parentList = UIListView.whence(this);
				if (parentList) {
					parentList.requestFocus();
					return true;
				}
				break;
			case "FocusIn":
				if (event.source === this.body) {
					// focus last focused item or first item instead of container
					this.requestFocus();
				} else {
					// store new focus index
					let idx = this.getIndexOfView(event.source);
					this.lastFocusedIndex = Math.max(0, idx);
				}

				// don't propagate the event to a parent list, if any
				return true;
		}

		// re-emit regular events
		this.emit(event);
		return false;
	}

	/** Update the container with (existing or new) components, one for each list item; only called from list observer */
	private _updateItems(ItemBody: ViewClass, BookEnd?: ViewClass) {
		if (this.isUnlinked()) return;

		// use entire list, or just a part of it
		let firstIndex = this.firstIndex;
		if (!(firstIndex >= 0)) firstIndex = 0;
		let maxItems = this.maxItems;
		let list = this.items;
		let items =
			list instanceof ManagedList &&
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
		let map = new Map<ManagedObject, UIListView.ItemControllerView<TItem>>();
		let components: View[] = [];
		for (let item of items) {
			let component = existing && existing.get(item);
			if (!component) {
				component = new UIListView.ItemControllerView(item, ItemBody);
			}
			components.push(component);
			map.set(item, component);
		}
		if (BookEnd) {
			let last = content.last();
			components.push(last instanceof BookEnd ? last : new BookEnd());
		}
		this._contentMap = map;
		content.replaceAll(components);

		// emit an event specific to this UIList
		this.emit("ListItemsChange");
	}

	/** Helper function to turn an array into a managed list */
	private _makeList(v: any[]) {
		return new ManagedList(
			...v.map((it) =>
				it instanceof ManagedObject ? it : new UIListView.ItemValueWrapper(it),
			),
		);
	}

	/** Map of already-created content components */
	private _contentMap?: Map<
		ManagedObject,
		UIListView.ItemControllerView<TItem>
	>;
}

export namespace UIListView {
	/**
	 * A managed object class containing a single list item value
	 * @see {@link UIListView}
	 * @see {@link UIListView.ItemControllerView}
	 */
	export class ItemValueWrapper<TValue> extends ManagedObject {
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
	export class ItemControllerView<TItem> extends ViewComposite {
		/**
		 * Creates a new item controller view object
		 * - This constructor is used by {@link UIListView} and should not be used directly by an application.
		 */
		constructor(item: TItem | ItemValueWrapper<TItem>, ItemBody: ViewClass) {
			super();
			this.item = item instanceof ItemValueWrapper ? item.value : item;
			this._ItemBody = ItemBody;
		}

		/** The encapsulated list (or array) item */
		readonly item: TItem;

		/**
		 * Implementation of {@link ViewComposite.delegateViewEvent}, emits events with the `delegate` property set to this object
		 */
		protected override delegateViewEvent(event: ManagedEvent) {
			event = ManagedEvent.withDelegate(event, this);
			this.emit(event);
			return true;
		}

		protected override createView() {
			return new this._ItemBody();
		}

		private _ItemBody: ViewClass;
	}

	/**
	 * Type alias for events delegated by {@link UIListView.ItemControllerView}
	 * - This type can be used for the argument of an event handler, for events that were originally emitted within a list item view, and have been delegated by {@link UIListView.ItemControllerView}. The list item itself is available as `event.delegate.item`.
	 * @see {@link UIListView}
	 * @see {@link UIListView.ItemControllerView}
	 */
	export type ItemEvent<
		TItem,
		TSource extends ManagedObject = ManagedObject,
	> = ManagedEvent<TSource> & {
		/** The item controller view that delegated the event; can be used to access the list item */
		delegate: ItemControllerView<TItem>;
	};
}
