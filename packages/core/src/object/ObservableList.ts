import { ObservableObject } from "./ObservableObject.js";
import { $_origin, unlinkObject } from "./object_util.js";
import { ObservableEvent } from "./ObservableEvent.js";
import { err, ERROR, invalidArgErr } from "../errors.js";

/** Private structure that's used to maintain a doubly-linked list */
type LinkedList<TObject extends ObservableObject> = {
	/** Map containing all links, referring to objects in the list */
	map: Map<TObject, RefLink<TObject>>;

	/** First link in the list */
	h?: RefLink<TObject>;

	/** Last link in the list */
	t?: RefLink<TObject>;
};

/** Doubly linked list chain object: stored in a map for each ObservableList */
type RefLink<TObject extends ObservableObject> = {
	/** Observable object (list element) itself; this must be *cleared* when removed from the list */
	o: TObject;

	/** Previous link in the list, if any */
	p?: RefLink<TObject>;

	/** Next link in the list, if any */
	n?: RefLink<TObject>;
};

/** Symbol property that's used to store linked list reference */
const $_list = Symbol("list");

/**
 * A data structure that contains an ordered set of observable objects
 *
 * @description
 * Lists of observable objects — instances of {@link ObservableObject} — can be represented using regular arrays. However, often a 'list of objects' needs to be more restrictive, especially in the context of a UI framework. An observable list is useful in the following cases:
 *
 * - The list should only contain instances of a certain type, or at least only ObservableObject instances.
 * - The list shouldn't contain any duplicates, gaps, or undefined values.
 * - The list should be observable: actions can be taken when items are added, removed, or reordered.
 * - Events from (attached) list items should be 'propagated' on the list, to avoid having to add event listeners for all items — see {@link ObservableEvent}.
 * - List items should be able to bind to the object containing the (attached) list — see {@link Binding}.
 *
 * Observable lists are used in many places throughout the framework, such as to reference view objects within a {@link UIContainer} object. Observable lists can also be used by application code to efficiently represent lists of data models or other records.
 *
 * **Attaching list items** — By default, objects aren't attached to the list, so they could be attached to other objects themselves and still be part of an observable list. However, you can enable automatic attachment of objects in a list using the {@link ObservableList.attachItems()} method. This ensures that objects in a list are only attached to the list itself, and are unlinked when they're removed from the list (and removed from the list when they're no longer attached to it, e.g. when moved to another auto-attaching list).
 *
 * **Events** — Since ObservableList itself inherits from ObservableObject, a list can emit events, too. When any objects are added, moved, or removed, a change event is emitted. The event names are either `Change`, `Add`, or `Remove`, with objects referenced by `added` or `removed` event data properties if possible. In addition, for auto-attaching lists (see {@link ObservableList.attachItems()}) any events that are emitted by an object are re-emitted on the list itself. The {@link ObservableEvent.source} property can be used to find the object that originally emitted the event.
 *
 * **Nested lists** — Observable lists can contain (and even attach to) other observable lists, which allows for building nested or recursive data structures that fully support bindings and events.
 *
 * @example
 * // Create a list, add and remove objects
 * let a = Object.assign(new ObservableObject(), { foo: "a" })
 * let b = Object.assign(new ObservableObject(), { foo: "b" })
 * let list = new ObservableList(a, b);
 *
 * let c = Object.assign(new ObservableObject(), { foo: "c" })
 * list.add(c);
 * list.length // => 3
 *
 * list.remove(b);
 * list.length // => 2
 *
 * let a = list.map(record => record.foo);
 * a // => ["a", "c"]
 *
 * // Lists can be iterated using for...of, too
 * for (let item of list) {
 *   // ...do something for each item
 * }
 */
export class ObservableList<
	T extends ObservableObject = ObservableObject,
> extends ObservableObject {
	static {
		// Disable bindings on ObservableList itself
		ObservableList.disableBindings();
	}

	/** Creates a new observable list containing the provided objects */
	constructor(...objects: T[]) {
		super();
		this[$_list] = { map: new Map(), h: undefined, t: undefined };
		for (let t of objects) this.insert(t);
	}

	/** The number of objects in the list */
	get length() {
		return this[$_list].map.size;
	}

	/** Iterator symbol, alias of {@link objects()} method */
	declare [Symbol.iterator]: () => IterableIterator<T>;

	/**
	 * Unlink handler, clears the list when unlinked
	 * @note If you extend this class and override this method, you must call `super.beforeUnlink()` to ensure the list is cleared.
	 */
	override beforeUnlink() {
		this.clear();
	}

	/**
	 * Returns an iterable iterator for this list
	 * - The iterable iterator can be used to iterate over the list using a 'for...of' statement, without being able to modify the list itself (similar to the `Array.values` method).
	 * - If the list is unlinked, the iterator stops immediately.
	 * @note The behavior of the iterator is undefined if the object _after_ the current object is removed, moved, or if another object is inserted before it. Removing the _current_ object or any previous objects during iteration is safe.
	 */
	objects(): IterableIterator<T> {
		let head = this[$_list].h;
		return {
			[Symbol.iterator]() {
				return this;
			},
			next: (): IteratorResult<T> => {
				let o = head && head.o;
				if (!this.isUnlinked() && o) {
					// point head to next link already, then return current object
					head = head!.n;
					return { value: o, done: false };
				}
				return { done: true, value: (head = undefined) };
			},
		};
	}

	/**
	 * Adds the provided objects to the end of the list
	 * @param items The objects to add to the list
	 * @error This method throws an error if one of the objects is already in the list.
	 * @error This method throws an error if one of the objects isn't of the correct type (see {@link ObservableList.restrict restrict()}).
	 */
	add(...items: T[]) {
		for (let t of items) this.insert(t);
		return this;
	}

	/**
	 * Inserts the provided object into the list, before the specified reference object
	 * - If no `before` argument is specified, the item is added to the end of the list.
	 * @param item The object to insert
	 * @param before The reference object, before which to insert the item
	 * @error This method throws an error if the item is already in the list.
	 * @error This method throws an error if the item isn't of the correct type (see {@link ObservableList.restrict restrict()}).
	 * @error This method throws an error if the reference object isn't in the list.
	 */
	insert(item: T, before?: T) {
		if (this.isUnlinked()) throw err(ERROR.Object_Unlinked);
		if (!item || item.isUnlinked()) throw invalidArgErr("item");
		if (!(item instanceof (this._restriction || ObservableObject)))
			throw err(ERROR.List_Restriction);
		const refs = this[$_list];
		if (before && !refs.map.has(before)) throw invalidArgErr("before");
		if (refs.map.has(item)) throw err(ERROR.List_Duplicate);

		// create new link to insert in the list
		let link: RefLink<T>;
		if (before) {
			// ... before other link
			let next = refs.map.get(before)!;
			let prev = next.p;
			link = { o: item, p: prev, n: next };
			next.p = link;
			if (prev) prev.n = link;
			else refs.h = link;
		} else {
			// ... or after current tail
			let tail = refs.t;
			link = { o: item, p: tail, n: undefined };
			if (tail) tail.n = link;
			else refs.h = link;
			refs.t = link;
		}
		refs.map.set(item, link);

		// attach object if needed
		if (this._attach) this._attachObject(item);

		// emit event for adding this object
		this.emit("Add", { change: this, added: item });

		return this;
	}

	/**
	 * Removes the specified object from the list
	 * - If the object isn't included in the list, this method simply does nothing.
	 * @param item The object to remove
	 */
	remove(item: T) {
		if (!item || this.isUnlinked()) return this;

		// find given object first
		let refs = this[$_list];
		let link = refs.map.get(item);
		if (link) {
			link.o = undefined as any;

			// remove link from the list
			refs.map.delete(item);
			if (link.p) link.p.n = link.n;
			else refs.h = link.n;
			if (link.n) link.n.p = link.p;
			else refs.t = link.p;

			// unlink object if needed
			if (this._attach && item[$_origin] === this) {
				unlinkObject(item);
			}

			// emit event for removing this object
			this.emit("Remove", { change: this, removed: item });
		}
		return this;
	}

	/**
	 * Removes the specified object and following objects, and inserts the provided objects in their place
	 * - If the `removeCount` argument isn't provided, all objects after the specified object are removed from the list.
	 * - If the `removeCount` argument is zero, new objects are inserted after the specified item.
	 * - If the item isn't found in the list, new objects are inserted at the end of the list.
	 * @param item The first object to remove
	 * @param removeCount The number of objects to remove
	 * @param insert The objects to insert into the list
	 * @returns An array containing the objects that were removed
	 */
	splice(item?: T, removeCount?: number, ...insert: T[]) {
		if (this.isUnlinked()) throw err(ERROR.Object_Unlinked);
		if (item != null && !(item instanceof ObservableObject))
			throw invalidArgErr("item");

		// find objects to remove, plus one (insertion point); if any
		if (removeCount === undefined) removeCount = this[$_list].map.size;
		let result: T[] =
			item && removeCount! >= 0 ? this.take(+removeCount! + 1, item) : [];

		// get the insertion point object, then remove others
		let afterItem = result.length > removeCount ? result.pop()! : undefined;
		for (let t of result) this.remove(t);

		// now insert given objects one by one
		for (let t of insert) this.insert(t, afterItem);
		return result;
	}

	/**
	 * Replaces the specified item with another object in-place
	 * @param item The object to replace
	 * @param replacement The object to replace the item with
	 * @error This method throws an error if the item isn't in the list, or if the replacement object is already in the list.
	 */
	replaceObject(item: T, replacement: T) {
		if (this.isUnlinked()) throw err(ERROR.Object_Unlinked);
		if (!replacement || replacement.isUnlinked())
			throw invalidArgErr("replace");
		if (!(replacement instanceof (this._restriction || ObservableObject)))
			throw err(ERROR.List_Restriction);
		let map = this[$_list].map;
		if (map.has(replacement)) throw err(ERROR.List_Duplicate);

		// find link and update its reference in place
		let link = map.get(item);
		if (!link) throw invalidArgErr("item");
		link.o = replacement;

		// update the object-link map
		map.delete(item);
		map.set(replacement, link);

		// attach/unlink objects if needed
		if (this._attach) {
			if (item[$_origin] === this) {
				unlinkObject(item);
			}
			this._attachObject(replacement);
		}
		this.emitChange();
		return this;
	}

	/**
	 * Replaces (or moves) all items in this list with the specified items
	 * - Existing items can be moved within the list if they're included in the new list of objects.
	 * - Items that aren't included in the provided list are removed from the observable list.
	 * - Items in the provided list that are not yet in the observable list are added such that the order of items matches that of the provided list.
	 * @param items The objects that this list should contain; either in an array or another ObservableList instance
	 */
	replaceAll(items: Iterable<T | undefined>) {
		if (this.isUnlinked()) throw err(ERROR.Object_Unlinked);

		// keep track of objects that were seen, to delete others
		let seen = new Map<T, true>();

		// keep track of moves/inserts that should happen later,
		// based on object and reference ('before') object
		type Place = [T, T | undefined, RefLink<T> | undefined];
		let moves: Place[] = [];
		let inserts: Place[] = [];

		// go through new object list to check if moving or adding
		let insertFixPos = 0;
		let refs = this[$_list];
		for (let item of items) {
			if (item == null) continue;
			seen.set(item, true);
			let link = refs.map.get(item);
			if (!link) {
				// ... new object, add before next existing object
				inserts.push([item, undefined, undefined]);
			} else {
				// ... existing object, fix last move and inserts first
				if (moves.length) moves[0]![1] = item;
				while (insertFixPos < inserts.length) {
					inserts[insertFixPos++]![1] = item;
				}

				// now add move (in reverse order, back to front)
				moves.unshift([item, undefined, link]);
			}
		}

		// delete any current objects that were *not* seen
		// (in random order, doesn't matter)
		for (let object of refs.map.keys()) {
			if (!seen.has(object)) this.remove(object);
		}

		// now, move existing objects, then insert new ones
		let doEmitChange = false;
		for (let op of moves) {
			if (op[1] === null && !op[2]!.n) continue;
			if (op[2]!.n && op[2]!.n.o === op[1]) continue;
			if (this._moveBefore(op[0], op[1])) doEmitChange = true;
		}
		for (let op of inserts) {
			this.insert(op[0], op[1]);
		}

		// emit event for moves, if needed
		if (doEmitChange) this.emitChange();

		return this;
	}

	/** @internal Moves the specified item to before other object; returns true if object was actually moved, false if it was already in the correct position */
	private _moveBefore(item: T, before?: T) {
		// Note on code coverage: some of these lines are never used because
		// of the algorithm used in `replace` above
		/* c8 ignore start */
		let refs = this[$_list];
		let link = refs.map.get(item);

		// find reference link and check if need to move
		let ref = (before && refs.map.get(before)) || undefined;
		if (!link || link.n === ref || link === ref) return false;

		// need to move, take link out first
		if (link.p) link.p.n = link.n;
		else refs.h = link.n;
		if (link.n) link.n.p = link.p;
		else refs.t = link.p;

		// now move link to before other one
		link.p = ref ? ref.p : refs.t;
		link.n = ref;
		if (link.p) link.p.n = link;
		else refs.h = link;
		if (ref) ref.p = link;
		else refs.t = link;

		/* c8 ignore stop */
		return true;
	}

	/** Removes all items from the list */
	clear() {
		let refs = this[$_list];
		if (refs.map.size) {
			// clear all links to mark them as removed
			let objects = this._attach ? [...refs.map.keys()] : undefined;
			refs.map.clear();
			for (let head = refs.h; head; head = head.n) {
				head.o = undefined as any;
			}
			refs.h = undefined;
			refs.t = undefined;

			// unlink all objects if needed, then emit single event
			if (objects) {
				for (let object of objects) {
					if (object[$_origin] === this) unlinkObject(object);
				}
			}
			this.emitChange();
		}
		return this;
	}

	/** Reverses all items in the list */
	reverse() {
		if (this.isUnlinked()) throw err(ERROR.Object_Unlinked);
		let refs = this[$_list];
		let head = refs.t;
		refs.t = refs.h;
		refs.h = head;
		while (head) {
			let next = head.p;
			head.p = head.n;
			head.n = next;
			head = next;
		}
		return this;
	}

	/** Sorts the list using the provided callback */
	sort(compareFn: (a: T, b: T) => number) {
		this.replaceAll(this.toArray().sort(compareFn));
		return this;
	}

	/** Returns the first object in the list */
	first() {
		return this[$_list].h?.o || undefined;
	}

	/** Returns the last object in the list */
	last() {
		return this[$_list].t?.o || undefined;
	}

	/**
	 * Returns the object that's at the specified position in the list
	 * @param index The list index for which to look up the current object, 0-based (i.e. the first object is at index 0, not 1)
	 * @error This method throws an error if the provided index isn't a number, a negative number, or outside the bounds of this list.
	 */
	get(index: number) {
		if (this.isUnlinked()) return;
		let last = this[$_list].map.size - 1;
		if (typeof index !== "number" || index > last || !(index >= 0))
			throw RangeError();

		// check where to find the index based on list length
		if (index === 0) return this[$_list].h!.o;
		if (index === last) return this[$_list].t!.o;
		if (index <= last >> 1) {
			// search from the head of the list, index is near the start
			for (let i = 0, cur = this[$_list].h; cur; i++) {
				if (i === index) return cur.o;
				cur = cur.n;
			}
			/* c8 ignore next */
		}

		// search from the tail of the list
		for (let i = last, cur = this[$_list].t; cur; i--) {
			if (i === index) return cur.o;
			cur = cur.p;
		}

		/* c8 ignore next */
		throw RangeError();
	}

	/**
	 * Returns a number of objects from the list
	 * @param n The number of objects to return
	 * @param startingFrom The first object to return (optional, defaults to the first item)
	 * @returns An array containing the objects in the list
	 */
	take(n: number, startingFrom?: T) {
		if (this.isUnlinked()) return [];
		let result: T[] = Array(n);
		let head: RefLink<T> | undefined = this[$_list].h;

		// if not starting from head, adjust position
		if (startingFrom) head = this[$_list].map.get(startingFrom);

		// take n elements and set on array
		let i: number;
		for (i = 0; head && i < n; ) {
			result[i++] = head.o;
			head = head.n;
		}
		result.length = i;
		return result;
	}

	/**
	 * Returns a number of objects from the list
	 * @param n The number of objects to return
	 * @param endingAt The last object to return (optional, defaults to the last item)
	 * @returns An array containing the objects in the list
	 */
	takeLast(n: number, endingAt?: T) {
		if (this.isUnlinked()) return [];
		let result: T[] = [];
		let tail: RefLink<T> | undefined = this[$_list].t;

		// if not ending at tail, adjust position
		if (endingAt) tail = this[$_list].map.get(endingAt);

		// take n elements by adding to start of array
		for (let i = 0; tail && i < n; i++) {
			result.unshift(tail.o);
			tail = tail.p;
		}
		return result;
	}

	/**
	 * Returns the index position (0-based) of the specified object in this list
	 * - If the object isn't found in the list, this method returns -1.
	 * @param item The object to look for
	 */
	indexOf(item: T) {
		if (this.isUnlinked()) return -1;

		// find link first, simply by looking at map,
		// then count number of steps back, if any
		let link: RefLink<T> | undefined = this[$_list].map.get(item);
		for (var i = -1; link; i++) link = link.p;
		return i;
	}

	/** Returns true if this list contains the specified object */
	includes(item: T) {
		if (this.isUnlinked()) return false;
		return this[$_list].map.has(item);
	}

	/** Returns the first object in the list for which the provided callback returns true */
	find(callback: (item: T) => any) {
		for (let t of this) if (callback(t)) return t;
	}

	/** Returns true if the provided callback returns true for at least one object in the list */
	some(callback: (item: T) => any) {
		for (let t of this) if (callback(t)) return true;
		return false;
	}

	/** Returns true if the provided callback returns true for all objects in the list */
	every(callback: (item: T) => any) {
		for (let t of this) if (!callback(t)) return false;
		return true;
	}

	/** Calls the provided callback for each object in the list */
	forEach(callback: (item: T) => void, thisArg?: any) {
		for (let t of this) callback.call(thisArg, t);
	}

	/**
	 * Returns an array of return values of the provided callback for all objects in the list
	 * - If the list is unlinked, this method returns an empty array.
	 * - The behavior of this method is undefined if the callback modifies the list.
	 */
	map<TResult>(callback: (item: T) => TResult) {
		let result: TResult[] = [];
		for (let t of this) result.push(callback(t));
		return result;
	}

	/**
	 * Returns an array of objects for which the provided callback function returns true
	 * - If the list is unlinked, this method returns an empty array.
	 * - The behavior of this method is undefined if the callback modifies the list.
	 */
	filter(callback: (item: T) => boolean | undefined) {
		let result: T[] = [];
		for (let t of this) callback(t) && result.push(t);
		return result;
	}

	/**
	 * Returns an array that contains all objects in the list
	 * - If the list is unlinked, this method returns an empty array.
	 * - If you only need to iterate over all values, use the {@link objects()} method instead.
	 */
	toArray() {
		if (this.isUnlinked()) return [];
		let head = this[$_list].h;
		let result: T[] = new Array(this[$_list].map.size);
		for (let i = 0; head; ) {
			result[i++] = head.o;
			head = head.n;
		}
		return result;
	}

	/** Returns an array that contains all objects in the list */
	toJSON(): any {
		return this.toArray();
	}

	/**
	 * Restricts the type of objects that can be added to this list
	 * @summary This method can be used to limit the type of objects that can be added to the list: all new objects should inherit from the specified class, otherwise they can't be added.
	 * @param ObservableObjectClass The class that all objects in this list should inherit from
	 * @returns The list itself, typed using the specified class.
	 * @error This method throws an error if the list currently already contains any objects that don't inherit from the specified class.
	 */
	restrict<R extends T>(ObservableObjectClass: {
		new (...args: any[]): R;
	}): ObservableList<R> {
		if (this[$_list].map.size) {
			// check existing objects
			for (let object of this[$_list].map.keys()) {
				if (!(object instanceof ObservableObjectClass))
					throw err(ERROR.List_Restriction);
			}
		}
		this._restriction = ObservableObjectClass;
		return this as any;
	}

	/**
	 * Enable (or disable) automatic attachment of new objects to the list itself
	 * @summary This method can be used to make the list contain all of its (current and new) items by attaching them. After enabling automatic attachment, adding an object to the list immediately attaches it; removing an object from the list unlinks it (since it's no longer attached); attaching an object to another object (or list) removes it from the list (since it can no longer be attached) — but the object won't be unlinked.
	 *
	 * When enabled, if the list currently contains any objects, they're immediately attached. Note that the feature can't be disabled once it has been enabled and there are any objects in the list.
	 *
	 * When enabled, events emitted on any object in the list are automatically re-emitted on the list itself (propagating the event) — unless the `noEventPropagation` argument is set to true, or the {@link ObservableEvent.noPropagation} property is set on the event itself.
	 *
	 * @param set True if all new objects should be attached to the list
	 * @param noEventPropagation True if events should _not_ be re-emitted on the list itself
	 *
	 * @error This method throws an error if the feature can't be enabled or disabled.
	 */
	attachItems(set: boolean, noEventPropagation?: boolean) {
		// set property to false ONLY if no attached objects
		if (!set && this._attach && this[$_list].map.size) {
			throw err(ERROR.List_AttachState);
		}

		// don't allow enabling more than once
		if (set && this._attach) throw invalidArgErr("set");

		// set property to automatically attach new objects
		this._attach = set;
		this._noPropagation = noEventPropagation;

		if (set) {
			// attach existing objects
			for (let object of this[$_list].map.keys()) {
				this._attachObject(object);
			}
		}
		return this;
	}

	private _attachObject(item: T) {
		// attach object, check for unlink/move and propagate events
		this.attach(item, {
			handler: (_, event) => {
				if (!this._noPropagation && !event.noPropagation) {
					this.emit(event);
				}
			},
			detached: (item) => {
				this.remove(item as T);
			},
		});
	}

	/** True if objects should be attached to this list when added (and no duplicates allowed) */
	private _attach?: boolean;

	/** True if attached object events should NOT be propagated */
	private _noPropagation?: boolean;

	/** Class reference, if objects are restricted using `restrict()` method */
	private _restriction: any;

	/** @internal Linked list, containing all objects */
	private readonly [$_list]: LinkedList<T>;
}

// set iterator to objects() method
ObservableList.prototype[Symbol.iterator] = ObservableList.prototype.objects;
