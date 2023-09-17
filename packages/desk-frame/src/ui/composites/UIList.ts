import { View, ViewClass, ViewComposite, app } from "../../app/index.js";
import {
	Binding,
	DelegatedEvent,
	ManagedEvent,
	ManagedList,
	ManagedObject,
	Observer,
} from "../../core/index.js";
import { ERROR, err } from "../../errors.js";
import type { UIComponent } from "../UIComponent.js";
import { UIColumn, UIContainer } from "../containers/index.js";

/** Default container used in the preset method */
const _defaultContainer = UIColumn.with({
	accessibleRole: "list",
	layout: { gravity: "start" },
	spacing: 0,
});

/**
 * A view composite that manages views for each item in a list of objects or values
 *
 * @description A list component creates and renders content based on a provided list data structure.
 *
 * **JSX tag:** `<list>`
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export class UIList extends ViewComposite {
	/**
	 * Creates a preset controller class with the specified property values, bindings, and event handlers
	 * @param preset Property values, bindings, and event handlers
	 * @param ItemBody A view class that's instantiated for each list item
	 * @param ContainerBody A view class that's used for the outer view container
	 * @param BookEnd A view class that's always added to the back of the container
	 * @returns A class that can be used to create instances of this view class with the provided property values, bindings, and event handlers
	 */
	static with(
		preset: UIComponent.ViewPreset<
			ViewComposite,
			UIList,
			"firstIndex" | "maxItems" | "animation"
		> & {
			/** List of objects, either an array, {@link ManagedList} object, or binding for either */
			items?: Iterable<any> | Binding<Iterable<any>>;
			/** True if the _container_ view object may receive input focus using the keyboard (e.g. Tab key) */
			allowKeyboardFocus?: boolean;
			/** Event that's emitted when list item views are rendered */
			onListItemsChange?: string;
		},
		ItemBody: ViewClass,
		ContainerBody?: ViewClass<UIContainer>,
		BookEnd?: ViewClass,
	): typeof UIList {
		// Define a view class to be used for each item
		class Adapter extends UIList.ItemController<any> {
			protected override createView() {
				return new ItemBody();
			}
		}

		// Define an observer class for the entire list
		class PresetListObserver extends Observer<UIList> {
			override observe(observed: UIList) {
				super
					.observe(observed)
					.observePropertyAsync("items", "firstIndex", "maxItems");
				this.doUpdateAsync();
				return this;
			}

			// when unlinked, always clear content to help GC
			override handleUnlink() {
				this.observed?._contentMap?.clear();
				super.handleUnlink();
			}

			// handle other updates asynchronously, catching all errors
			async onItemsChange(v?: any, e?: ManagedEvent) {
				if (!e || e.source === this.observed?.items) {
					await this.doUpdateAsync();
				}
			}
			async onFirstIndexChange() {
				await this.doUpdateAsync();
			}
			async onMaxItemsChange() {
				await this.doUpdateAsync();
			}

			async doUpdateAsync() {
				if (this._pending) return;
				this._pending = true;
				await Promise.resolve();
				this._pending = false;
				this.observed?._updateItems(Adapter, BookEnd);
			}
			private _pending?: boolean;
		}

		// return a preset view class referencing the above
		return class PresetView extends this {
			constructor() {
				super();
				this.applyViewPreset({ ...preset });

				// create the view *already*, then add observer,
				// to avoid unnecessary async updates
				this.body = this.createView();
				if (preset.allowKeyboardFocus) this.body.allowKeyboardFocus = true;
				new PresetListObserver().observe(this);
			}
			protected override createView() {
				return new (ContainerBody || _defaultContainer)();
			}
		};
	}

	/** Creates a new UIList view composite object */
	constructor() {
		super();
		let list: ManagedList | undefined;
		Object.defineProperty(this, "items", {
			configurable: true,
			enumerable: true,
			get(this: UIList) {
				return list;
			},
			set(this: UIList, v: any) {
				if (Array.isArray(v)) v = this._makeList(v);
				if (!(v instanceof ManagedList) && v != null) {
					throw err(ERROR.UIList_Invalid);
				}
				list = v;
			},
		});
	}

	/**
	 * The list container component
	 * - On instances of preset UIList classes, this property defaults to a column view without any spacing, but can be preset to another container view.
	 * - This property should not be changed on UIList instances.
	 */
	declare body: UIContainer;

	/**
	 * The list of objects, from which each object is used to construct one view object
	 * - This property should be set or bound to a {@link ManagedList} object or an array.
	 * - When set to an array, the property setter _converts_ the array to a {@link ManagedList} automatically, and uses that instead.
	 * - When updated, a {@link UIList.ItemController} view instance is created for each list item and added to the {@link body} container.
	 */
	declare items?: ManagedList;

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
	 * List content animation options
	 * - If this property is set, content changes are animated automatically. Note that this requires the list to be set to a {@link ManagedList} object, not an array.
	 * - This property should be set to an object containing duration (in milliseconds) and timing (optional cubic bezier control parameters) properties.
	 */
	animation?: Readonly<{
		duration: number;
		timing?: [number, number, number, number];
	}>;

	/** The index of the last focused list item view, if any */
	lastFocusedIndex = 0;

	/**
	 * Returns the list index of the specified view, or of its parent(s)
	 * - If the specified view object is (currently) not contained within the list container, this method returns -1.
	 */
	getIndexOfView(view?: ManagedObject) {
		let container = this.body as UIContainer;
		if (!container) return -1;
		while (view && ManagedObject.whence(view) !== container.content) {
			view = ManagedObject.whence(view);
		}
		if (view) return container.content.indexOf(view as any);
		return -1;
	}

	/** Requests input focus on the last-focused list view object, or the first one, if possible */
	override requestFocus() {
		// pass on to last focused component (or first)
		let container = this.body as UIContainer;
		if (container && container.content.count > 0) {
			let lastFocusedIdx = Math.max(this.lastFocusedIndex, 0);
			let index = Math.min(container.content.count - 1, lastFocusedIdx);
			let goFocus: any = container.content.get(index);
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
		if (this.lastFocusedIndex < lastIndex) {
			this.lastFocusedIndex++;
			this.requestFocus();
			return true;
		}
		return false;
	}

	protected override delegateViewEvent(event: ManagedEvent) {
		return super.delegateViewEvent(event) || !!this.emit(event);
	}

	/**
	 * FocusIn event handler, stores the index of the focused item as {@link lastFocusedIndex}
	 * - This method always returns true to avoid propagating focus events to a parent list, if any.
	 */
	protected onFocusIn(event: ManagedEvent) {
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

	/**
	 * FocusPrevious event handler, calls {@link focusPreviousItem()} or moves focus back to a containing list
	 * - The FocusPrevious event can be emitted by a list item view, e.g. on arrow key press (onArrowUpKeyPress) to move focus within the list.
	 * - This method always returns true to avoid propagating focus events to a parent list, if any.
	 */
	protected onFocusPrevious() {
		if (!this.focusPreviousItem()) {
			let parentList = UIList.whence(this);
			if (parentList) parentList.requestFocus();
		}
		return true;
	}

	/**
	 * FocusNext event handler, calls {@link focusNextItem()}
	 * - The FocusNext event can be emitted by a list item view, e.g. on arrow key press (onArrowDownKeyPress) to move focus within the list.
	 * - This method returns true if a next item has been found, to avoid propagating focus events to a parent list, if any. Otherwise, the event is propagated to the parent list (to focus the item after the current parent item).
	 */
	protected onFocusNext() {
		return this.focusNextItem();
	}

	/** Update the container with (existing or new) components, one for each list item */
	private _updateItems(
		Adapter: ViewClass<UIList.ItemController<ManagedObject>>,
		BookEnd?: ViewClass,
	) {
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
		this._observeAnimation();
		let content = this.body?.content;
		if (!content || !items) {
			this._contentMap && this._contentMap.clear();
			this._contentMap = undefined;
			content && content.clear();
			return;
		}

		// keep track of existing view instances for each object
		let existing = this._contentMap;
		let map = new Map<ManagedObject, View>();
		let components: View[] = [];
		for (let item of items) {
			let component = existing && existing.get(item);
			if (!component) {
				component = new Adapter(item);
			}
			components.push(component);
			map.set(item, component);
		}
		if (BookEnd) {
			let last = content.last();
			components.push(last instanceof BookEnd ? last : new BookEnd());
		}
		this._contentMap = map;
		content.replace(components);

		// emit an event specific to this UIList
		this.emit("ListItemsChange");
	}

	/** observe content updates if animation is enabled */
	private _observeAnimation() {
		if (this.animation && this.body && !this._animationObserved) {
			let observer = new AnimationObserver().observe(this.body);
			observer.list = this;
			this._animationObserved = true;
		}
	}

	/** Helper function to turn an array into a managed list */
	private _makeList(v: any[]) {
		return new ManagedList(
			...v.map((it) =>
				it instanceof ManagedObject ? it : new UIList.ItemValueWrapper(it),
			),
		);
	}

	/** True if ContentUpdate event is already observed on content component */
	private _animationObserved = false;

	/** Map of already-created content components */
	private _contentMap?: Map<ManagedObject, View>;
}

/** @internal Observer class that's used on the container to animate list items */
class AnimationObserver extends Observer<UIContainer> {
	list?: UIList;
	onContentRendering(e: UIContainer.ContentRenderingEvent) {
		let animation = this.list && this.list.animation;
		if (animation && animation.duration && app.renderer) {
			// transition all output asynchronously, one by one
			let output = e.data.output;
			for (let out of output) {
				let transform = out && app.renderer.transform(out);
				if (transform) {
					transform
						.smoothOffset()
						.timing(animation.duration, animation.timing || [0.2, 1, 0.2, 1]);
				}
			}
		}
	}
}

export namespace UIList {
	/**
	 * A managed object class that contains a list (array) item which is itself not a managed object
	 * @see {@link UIList}
	 * @see {@link UIList.ItemController}
	 */
	export class ItemValueWrapper<TValue> extends ManagedObject {
		/**
		 * Creates a new wrapper object
		 * - This constructor is used by {@link UIList} and should not be used from an application.
		 */
		constructor(value: TValue) {
			super();
			this.value = value;
		}

		/** The array item */
		value: TValue;
	}

	/**
	 * A view that's created automatically for each list item by {@link UIList}
	 * @see {@link UIList}
	 */
	export class ItemController<TItem> extends ViewComposite {
		/**
		 * Creates a new item controller view object
		 * - This constructor is used by {@link UIList} and should not be used directly by an application.
		 */
		constructor(item: TItem | ItemValueWrapper<TItem>) {
			super();
			this.item = item instanceof ItemValueWrapper ? item.value : item;
		}

		/** The encapsulated list (or array) item */
		readonly item: TItem;

		/**
		 * Implementation of {@link ViewComposite.delegateViewEvent}, emits events with the `delegate` property set to this object
		 */
		protected override delegateViewEvent(event: ManagedEvent) {
			if (!super.delegateViewEvent(event)) {
				this.emit(
					new ManagedEvent(event.name, event.source, event.data, this, event),
				);
			}
			return true;
		}
	}

	/**
	 * Type alias for events delegated by {@link UIList.ItemController}
	 * - This type can be used for the argument of an event handler, for events that were originally emitted within a list item view, and have been delegated by {@link UIList.ItemController}. The list item itself is available as `event.delegate.item`.
	 * @see {@link UIList}
	 * @see {@link UIList.ItemController}
	 */
	export type ItemEvent<
		TItem,
		TSource extends ManagedObject = ManagedObject,
	> = DelegatedEvent<ItemController<TItem>, TSource>;
}
