import {
	ManagedObject,
	ManagedList,
	ManagedEvent,
	Observer,
	bound,
} from "../../../dist/index.js";
import { describe, expect, test } from "@desk-framework/frame-test";

describe("ManagedList", () => {
	/** Class used throughout tests below */
	class NamedObject extends ManagedObject {
		constructor(public name: string) {
			super();
		}
	}

	describe("Basic adding and removing", () => {
		// define some objects to be used for testing below:
		let a = new NamedObject("a");
		let b = new NamedObject("b");
		let c = new NamedObject("c");

		test("Constructor", () => {
			let list = new ManagedList();
			expect(list).toBeInstanceOf(ManagedList);
			expect(list.count).toBe(0);
		});

		test("Constructor with initial list", () => {
			let list = new ManagedList(a, b, c);
			expect(list.count).toBe(3);
			expect(list.toArray()).toBeArray([a, b, c]);
		});

		test("Adding items: add", () => {
			let list = new ManagedList<NamedObject>();
			list.add(a);
			expect(list.count).toBe(1);
			list.add(b, c);
			expect(list.count).toBe(3);

			// test using first, last, toArray
			expect(list.first()).toHaveProperty("name").toBe("a");
			expect(list.last()).toHaveProperty("name").toBe("c");
			expect(list.toArray()).toBeArray([a, b, c]);

			// can't add unlinked objects
			let foo = new NamedObject("unlinked").unlink();
			expect(() => list.add(foo)).toThrowError();
		});

		test("Adding items: insert", () => {
			let list = new ManagedList<NamedObject>();
			list.insert(a);
			list.insert(b);
			list.insert(c, a);
			expect(list.count).toBe(3);

			// test using first, last, toArray
			expect(list.first()).toHaveProperty("name").toBe("c");
			expect(list.last()).toHaveProperty("name").toBe("b");
			expect(list.toArray()).toBeArray([c, a, b]);

			// can't add before non-existent items
			expect(() =>
				list.insert(new NamedObject(""), new NamedObject("")),
			).toThrowError();
		});

		test("Can't add duplicates", () => {
			let list = new ManagedList<NamedObject>();
			list.insert(a);
			expect(() => list.insert(a)).toThrowError();
		});

		test("Removing first, middle, last elements", () => {
			// removing only element
			let list = new ManagedList(a);
			list.remove(a);
			expect(list.count).toBe(0);
			expect(list.toArray()).toBeArray(0);

			// removing head and tail
			list = new ManagedList(a, b, c);
			list.remove(a);
			expect(list.count).toBe(2);
			expect(list.toArray()).toBeArray([b, c]);
			list.remove(c);
			expect(list.count).toBe(1);
			expect(list.toArray()).toBeArray([b]);
			expect(list.takeLast(10)).toBeArray([b]);

			// removing middle element
			list = new ManagedList(a, b, c);
			list.remove(b);
			expect(list.count).toBe(2);
			expect(list.toArray()).toBeArray([a, c]);
			expect(list.takeLast(10)).toBeArray([a, c]);
		});

		test("Splice: empty result", () => {
			let list = new ManagedList(a, b, c);
			expect(list.splice()).toBeArray(0);
			expect(list.splice(undefined, 0)).toBeArray(0);
			expect(list.splice(undefined, 3)).toBeArray(0);
			expect(list.splice(a, 0)).toBeArray(0);

			// doesn't throw if target is not in the list
			expect(list.splice(new NamedObject("d"))).toBeArray(0);

			// throws when target is invalid
			expect(() => list.splice({} as any)).toThrowError();
		});

		test("Splice: complete result, empty list (undefined)", () => {
			let list = new ManagedList(a, b, c);
			expect(list.splice(a)).toBeArray([a, b, c]);
			expect(list.count).toBe(0);
			expect(list.first() || list.last()).toBeUndefined();
		});

		test("Splice: complete result, empty list (number)", () => {
			let list = new ManagedList(a, b, c);
			expect(list.splice(a, 3)).toBeArray([a, b, c]);
			expect(list.count).toBe(0);
			expect(list.first() || list.last()).toBeUndefined();
		});

		test("Splice: partial result, partial list", () => {
			// take from end
			let list = new ManagedList(a, b, c);
			expect(list.splice(b, 2)).toBeArray([b, c]);
			expect(list.count).toBe(1);
			expect(list.first()).toBe(a);
			expect(list.last()).toBe(a);

			// take from start
			list = new ManagedList(a, b, c);
			expect(list.splice(a, 2)).toBeArray([a, b]);
			expect(list.count).toBe(1);
			expect(list.first()).toBe(c);
			expect(list.last()).toBe(c);

			// take from middle
			list = new ManagedList(a, b, c);
			expect(list.splice(b, 1)).toBeArray([b]);
			expect(list.count).toBe(2);
			expect(list.toArray()).toBeArray([a, c]);
			expect(list.last()).toBe(c);
		});

		test("Splice: insert without removing", () => {
			// insert at end
			let list = new ManagedList(a, b);
			expect(list.splice(undefined, 0, c)).toBeArray(0);
			expect(list.count).toBe(3);
			expect(list.toArray()).toBeArray([a, b, c]);
			expect(list.last()).toBe(c);

			// insert at start
			list = new ManagedList(b, c);
			expect(list.splice(b, 0, a)).toBeArray(0);
			expect(list.count).toBe(3);
			expect(list.toArray()).toBeArray([a, b, c]);
			expect(list.first()).toBe(a);

			// insert in middle
			list = new ManagedList(a, c);
			expect(list.splice(c, 0, b)).toBeArray(0);
			expect(list.count).toBe(3);
			expect(list.toArray()).toBeArray([a, b, c]);
		});

		test("Splice: remove and insert", () => {
			let d = new NamedObject("d");

			// remove end (undefined)
			let list = new ManagedList(a, b, c);
			expect(list.splice(c, undefined, d)).toBeArray([c]);
			expect(list.count).toBe(3);
			expect(list.toArray()).toBeArray([a, b, d]);
			expect(list.last()).toBe(d);

			// remove end (specific)
			list = new ManagedList(a, b, c);
			expect(list.splice(c, 1, d)).toBeArray([c]);
			expect(list.count).toBe(3);
			expect(list.toArray()).toBeArray([a, b, d]);
			expect(list.last()).toBe(d);

			// remove start
			list = new ManagedList(a, b, c);
			expect(list.splice(a, 1, d)).toBeArray([a]);
			expect(list.count).toBe(3);
			expect(list.toArray()).toBeArray([d, b, c]);
			expect(list.first()).toBe(d);

			// remove middle
			list = new ManagedList(a, b, c);
			expect(list.splice(b, 1, d)).toBeArray([b]);
			expect(list.count).toBe(3);
			expect(list.toArray()).toBeArray([a, d, c]);

			// remove and put back
			list = new ManagedList(a, b, c);
			expect(list.splice(b, 1, d, b)).toBeArray([b]);
			expect(list.count).toBe(4);
			expect(list.toArray()).toBeArray([a, d, b, c]);
		});

		test("Splice: string value as number", () => {
			let list = new ManagedList(a, b, c);
			expect(list.splice(a, "2" as any)).toBeArray([a, b]);
			expect(list.count).toBe(1);
			expect(list.first()).toBe(c);
			expect(list.last()).toBe(c);
		});

		test("Replace: insert only", () => {
			let list = new ManagedList<NamedObject>();
			list.replace([a, b, undefined, , null as any, c]); // gaps
			expect(list.count).toBe(3);
			expect(list.toArray()).toBeArray([a, b, c]);
		});

		test("Replace: remove only", () => {
			let list = new ManagedList(a, b, c);
			list.replace([]);
			expect(list.count).toBe(0);
			expect(list.toArray()).toBeArray(0);
		});

		test("Replace: move only", () => {
			let list = new ManagedList(a, b, c);
			list.replace([c, b, a]);
			expect(list.count).toBe(3);
			expect(list.toArray()).toBeArray([c, b, a]);
			expect(list.takeLast(3)).toBeArray([c, b, a]);
			list.replace([c, b, a]);
			list.replace([b, c, a]);
			expect(list.count).toBe(3);
			expect(list.toArray()).toBeArray([b, c, a]);
			expect(list.takeLast(3)).toBeArray([b, c, a]);
		});

		test("Replace: complete", () => {
			let items: NamedObject[] = [];
			for (let i = 0; i < 10; i++) {
				items.push(new NamedObject(String(i)));
			}
			let list = new ManagedList(items[0]!, items[1]!, items[2]!);
			let order = [6, 7, 8, 9, 1, 3, 4, 0, 5];
			list.replace(order.map((i) => items[i]));
			expect(list.map((o) => +o.name)).toBeArray(order);
		});

		test("Clearing list: clear", () => {
			let list = new ManagedList(a, b, c);
			list.clear();
			expect(list.count).toBe(0);
			expect(list.toArray()).toBeArray(0);
			expect(list.takeLast(1)).toBeArray(0);

			// clearing again should do nothing
			list.clear();
			expect(list.first()).toBeUndefined();
			expect(list.last()).toBeUndefined();
		});

		test("Clearing list: unlink", () => {
			let list = new ManagedList(a, b, c);
			list.unlink();
			expect(list.count).toBe(0);
			expect(list.toArray()).toBeArray(0);
			expect(list.takeLast(1)).toBeArray(0);

			// check methods throwing errors
			expect(() => list.clear()).not.toThrowError();
			expect(() => list.remove(a)).not.toThrowError();
			expect(() => list.add(a)).toThrowError();
			expect(() => list.splice(a)).toThrowError();
			expect(() => list.replace([])).toThrowError();
			expect(() => list.reverse()).toThrowError();
			expect(list.get(0)).toBeUndefined();
			expect(list.take(3)).toBeArray(0);
			expect(list.takeLast(3)).toBeArray(0);
			expect(list.indexOf(a)).toBe(-1);
			expect(list.includes(a)).toBeFalsy();
			expect(() => list.add(new NamedObject(""))).toThrowError();
			expect(() => {
				let i = 0;
				for (let _t of list) i++;
				return i;
			})
				.not.toThrowError()
				.toBe(0);
			expect(list.map(() => {})).toBeArray(0);
			expect(list.find(() => {})).toBe(undefined);
			expect(list.some(() => {})).toBe(false);
			expect(list.every(() => {})).toBe(true);
		});

		test("Reverse", () => {
			let list = new ManagedList(a, b, c);
			let array = list.toArray();
			array.reverse();
			list.reverse();
			expect(list.first()).toBe(c);
			expect(list.last()).toBe(a);
			expect(list.toArray()).toBeArray(array);
			expect(list.takeLast(3)).toBeArray(array);
		});

		test("Restrict by class", () => {
			let list = new ManagedList().restrict(NamedObject);
			expect(() => list.add({ fails: true } as any)).toThrowError();
			expect(() => list.add(new ManagedObject() as any)).toThrowError();
			expect(() => list.add(new NamedObject("a"))).not.toThrowError();

			let abcList = new ManagedList<any>(a, b, c);
			class OtherClass extends ManagedObject {}
			expect(() => abcList.restrict(OtherClass)).toThrowError();
			expect(() => abcList.restrict(NamedObject)).not.toThrowError();
		});
	});

	// ------------------------------------------------------
	describe("Accessors", () => {
		// helper function to make two lists, inserted in different orders
		// but all resulting in objects named a, b, c, d, e
		function makeLists() {
			let objects = [
				new NamedObject("a"),
				new NamedObject("b"),
				new NamedObject("c"),
				new NamedObject("d"),
				new NamedObject("e"),
			] as const;
			let list1 = new ManagedList<NamedObject>();
			list1.add(...objects);

			let list2 = new ManagedList<NamedObject>();
			list2.add(objects[4]); // e
			list2.insert(objects[2], objects[4]); // c, e
			list2.insert(objects[0], objects[2]); // a, c, e
			list2.insert(objects[1], objects[2]); // a, b, c, e
			list2.insert(objects[3], objects[4]); // a, b, c, d, e

			// return both lists as well as original array
			return [list1, list2, objects] as [
				typeof list1,
				typeof list2,
				typeof objects,
			];
		}

		test("get", () => {
			let [list1, list2] = makeLists();
			expect(list1.get(0)).toHaveProperty("name").toBe("a");
			expect(list1.get(1)).toHaveProperty("name").toBe("b");
			expect(list1.get(2)).toHaveProperty("name").toBe("c");
			expect(list1.get(3)).toHaveProperty("name").toBe("d");
			expect(list1.get(4)).toHaveProperty("name").toBe("e");

			expect(list2.get(0)).toHaveProperty("name").toBe("a");
			expect(list2.get(1)).toHaveProperty("name").toBe("b");
			expect(list2.get(2)).toHaveProperty("name").toBe("c");
			expect(list2.get(3)).toHaveProperty("name").toBe("d");
			expect(list2.get(4)).toHaveProperty("name").toBe("e");

			expect(() => list1.get("" as any)).toThrowError();
			expect(() => list1.get("1" as any)).toThrowError();
			expect(() => list1.get(-1)).toThrowError();
			expect(() => list1.get(5)).toThrowError();
			expect(() => list2.get(5)).toThrowError();
		});

		test("take", () => {
			let [list1, list2, orig] = makeLists();
			let fromC = orig.slice(2);

			// take zero elements: empty array
			expect(list1.take(0)).toBeArray(0);
			expect(list2.take(0)).toBeArray(0);

			// take 5 (max) from start
			expect(list1.take(5)).toBeArray(orig);
			expect(list2.take(5)).toBeArray(orig);
			expect(list1.take(500)).toBeArray(orig);
			expect(list2.take(500)).toBeArray(orig);

			// take 3 (max) from third element
			expect(list1.take(3, fromC[0])).toBeArray(fromC);
			expect(list2.take(3, fromC[0])).toBeArray(fromC);
			expect(list1.take(500, fromC[0])).toBeArray(fromC);
			expect(list2.take(500, fromC[0])).toBeArray(fromC);

			// if startingFrom not in list, returns empty array
			expect(list1.take(5, new NamedObject("f"))).toBeArray(0);
			expect(list2.take(5, new NamedObject("f"))).toBeArray(0);
		});

		test("takeLast", () => {
			let [list1, list2, orig] = makeLists();
			let untilC = orig.slice(0, 3);

			// take zero elements: empty array
			expect(list1.takeLast(0)).toBeArray(0);
			expect(list2.takeLast(0)).toBeArray(0);

			// take 5 (max) until end
			expect(list1.takeLast(5)).toBeArray(orig);
			expect(list2.takeLast(5)).toBeArray(orig);
			expect(list1.takeLast(500)).toBeArray(orig);
			expect(list2.takeLast(500)).toBeArray(orig);

			// take 3 (max) until third element
			expect(list1.takeLast(3, untilC[2])).toBeArray(untilC);
			expect(list2.takeLast(3, untilC[2])).toBeArray(untilC);
			expect(list1.takeLast(500, untilC[2])).toBeArray(untilC);
			expect(list2.takeLast(500, untilC[2])).toBeArray(untilC);

			// if endingAt not in list, returns empty array
			expect(list1.takeLast(5, new NamedObject("f"))).toBeArray(0);
			expect(list2.takeLast(5, new NamedObject("f"))).toBeArray(0);
		});

		test("indexOf", () => {
			let [list1, list2, orig] = makeLists();
			for (let i = 0; i < orig.length; i++) {
				expect(list1.indexOf(orig[i]!)).toBe(i);
				expect(list2.indexOf(orig[i]!)).toBe(i);
			}
			expect(list1.indexOf(new NamedObject("f"))).toBe(-1);
			expect(list2.indexOf(new NamedObject("f"))).toBe(-1);
		});

		test("includes", () => {
			let [list1, list2, orig] = makeLists();
			for (let t of orig) {
				expect(list1.includes(t)).toBeTruthy();
				expect(list2.includes(t)).toBeTruthy();
			}
			expect(list1.includes(new NamedObject("f"))).toBeFalsy();
			expect(list2.includes(new NamedObject("f"))).toBeFalsy();
		});

		test("find", () => {
			let [list1, list2] = makeLists();
			for (let s of ["a", "b", "c", "d", "e"]) {
				expect(list1.find((t) => t.name === s))
					.toHaveProperty("name")
					.toBe(s);
				expect(list2.find((t) => t.name === s))
					.toHaveProperty("name")
					.toBe(s);
			}
			expect(list1.find(() => false)).toBeUndefined();
			expect(list2.find(() => false)).toBeUndefined();
		});

		test("some", () => {
			let [list] = makeLists();
			for (let s of ["a", "b", "c", "d", "e"])
				expect(list.some((t) => t.name === s)).toBeTruthy();
			expect(list.some(() => false)).toBeFalsy();
		});

		test("every", () => {
			let [list] = makeLists();
			for (let s of ["a", "b", "c", "d", "e"])
				expect(list.every((t) => t.name !== s)).toBeFalsy();
			expect(list.every(() => true)).toBeTruthy();
		});

		test("map", () => {
			let [list1, list2, orig] = makeLists();
			expect(list1.map((o) => o)).toBeArray(orig);
			expect(list2.map((o) => o)).toBeArray(orig);
		});

		test("toArray and toJSON", () => {
			let [list1, list2, orig] = makeLists();
			expect(list1.toArray()).toBeArray(orig);
			expect(list2.toArray()).toBeArray(orig);
			expect(list2.toJSON()).toBeArray(orig);
			expect(list2.toJSON()).toBeArray(orig);
			expect(new ManagedList().toArray()).toBeArray(0);
			expect(new ManagedList().toJSON()).toBeArray(0);
		});

		test("Removing objects from an iterator", () => {
			let [list] = makeLists();
			for (let t of list) {
				list.remove(t);
			}
			expect(list.count).toBe(0);
			expect(list.toArray()).toBeArray(0);
			expect(list.takeLast(1)).toBeArray(0);
		});

		test("Inserting objects from an iterator", () => {
			let [list] = makeLists();
			let a = list.first()!;
			list.remove(a);
			for (let t of list) {
				if (t.name === "d") list.insert(a, t);
			}
			expect(list.map((a) => a.name)).toBeArray(["b", "c", "a", "d", "e"]);
		});

		test("Clearing in the middle of an iterator", () => {
			let [list] = makeLists();
			let result: any[] = [];
			for (let t of list) {
				result.push(t.name);
				if (t.name === "c") list.clear();
			}
			expect(result).toBeArray(["a", "b", "c"]);
		});
	});

	// ------------------------------------------------------
	describe("Attachment", () => {
		test("Objects are attached when list is attached", () => {
			let a = new NamedObject("a");
			let list = new ManagedList(a);
			expect(ManagedObject.whence(a)).toBeUndefined();
			let parent = new ManagedList().attachAll(true);
			parent.add(list);
			expect(ManagedObject.whence(list)).toBe(parent);
			expect(ManagedObject.whence(a)).toBe(list);
			let b = new NamedObject("b");
			list.add(b);
			expect(ManagedObject.whence(b)).toBe(list);
		});

		test("Override auto attach", () => {
			let list = new ManagedList().attachAll(false);
			let a = new NamedObject("a");
			list.add(a);
			expect(ManagedObject.whence(a)).toBeUndefined();
			let parent = new ManagedList().attachAll(true);
			parent.add(list);
			expect(ManagedObject.whence(list)).toBe(parent);
			expect(ManagedObject.whence(a)).toBeUndefined();
			let b = new NamedObject("b");
			list.add(b);
			expect(ManagedObject.whence(b)).toBeUndefined();
		});

		test("Can't override with existing objects", () => {
			let a = new NamedObject("a");
			let list = new ManagedList(a);
			let parent = new ManagedList().attachAll(true);
			parent.add(list);
			expect(() => list.attachAll(false)).toThrowError();
		});

		test("Attached objects, before adding", () => {
			let list = new ManagedList().attachAll(true);
			let a = new NamedObject("a");
			list.add(a);
			expect(ManagedObject.whence(a)).toBe(list);
		});

		test("Attached objects, after adding", () => {
			let a = new NamedObject("a");
			let list = new ManagedList(a).attachAll(true);
			expect(ManagedObject.whence(a)).toBe(list);
		});

		test("Attached objects are unlinked when removed: remove", () => {
			let a = new NamedObject("a");
			let list = new ManagedList(a).attachAll(true);
			list.remove(a);
			expect(a.isUnlinked()).toBeTruthy();
		});

		test("Attached objects are unlinked when removed: clear", () => {
			let a = new NamedObject("a");
			let list = new ManagedList(a).attachAll(true);
			list.clear();
			expect(a.isUnlinked()).toBeTruthy();
		});

		test("Attached objects are unlinked when removed: unlink", () => {
			let a = new NamedObject("a");
			let list = new ManagedList(a).attachAll(true);
			list.unlink();
			expect(a.isUnlinked()).toBeTruthy();
		});

		test("Objects aren't unlinked when not attached: remove", () => {
			let a = new NamedObject("a");
			let list = new ManagedList(a).attachAll(false);
			list.remove(a);
			expect(a.isUnlinked()).toBeFalsy();
		});

		test("Objects aren't unlinked when not attached: clear", () => {
			let a = new NamedObject("a");
			let list = new ManagedList(a).attachAll(false);
			list.clear();
			expect(a.isUnlinked()).toBeFalsy();
		});

		test("Objects aren't unlinked when not attached: unlink", () => {
			let a = new NamedObject("a");
			let list = new ManagedList(a).attachAll(false);
			list.unlink();
			expect(a.isUnlinked()).toBeFalsy();
		});

		test("Attached objects are moved using replace", () => {
			let a = new NamedObject("a");
			let b = new NamedObject("b");
			let list = new ManagedList(a, b).attachAll(true);
			list.replace([b, a]);
			expect(a.isUnlinked()).toBeFalsy();
			expect(b.isUnlinked()).toBeFalsy();
		});

		test("Remove attached object when unlinked", () => {
			let a = new NamedObject("a");
			let list = new ManagedList(a).attachAll(true);
			expect(ManagedObject.whence(a)).toBe(list);
			a.unlink();
			expect(ManagedObject.whence(a)).toBeUndefined();
			expect(list.count).toBe(0);
			expect(list.includes(a)).toBeFalsy();
		});

		test("Attached objects are unlinked when attached list unlinked", (t) => {
			class MyChild extends ManagedObject {
				override beforeUnlink() {
					t.count("unlink");
				}
			}
			class MyParent extends ManagedObject {
				list = this.attach(
					new ManagedList(new MyChild(), new MyChild(), new MyChild()),
				);
			}
			let p = new MyParent();
			p.unlink();
			t.expectCount("unlink").toBe(3);
		});
	});

	// ------------------------------------------------------
	describe("Events and observation", () => {
		class ListEventObserver extends Observer<ManagedList> {
			added = 0;
			removed = 0;
			changed = 0;
			lastEvent?: ManagedEvent;
			lastObject?: any;
			lastSource?: any;
			countsSeen: number[] = [];
			protected override handleEvent(event: any) {
				this.lastEvent = event;
				this.lastSource = event.source;
				this.countsSeen.push(this.observed?.count || 0);
				if (event.name === "ManagedObjectAdded") this.added++;
				if (event.name === "ManagedObjectRemoved") this.removed++;
				if (event.name === "ManagedListChange") this.changed++;
				if (event.data && "object" in event.data)
					this.lastObject = event.data.object;
			}
		}

		test("Object added event: add, insert", () => {
			let list = new ManagedList();
			let observer = new ListEventObserver().observe(list);
			let a = new NamedObject("a");
			list.add(a);
			let b = new NamedObject("b");
			list.insert(b, a);
			expect(observer.added).toBe(2);
			expect(observer.removed).toBe(0);
			expect(observer.changed).toBe(0);
			expect(observer.lastEvent)
				.toHaveProperty("name")
				.toBe("ManagedObjectAdded");
			expect(observer.lastObject).toBe(b);
			expect(observer.lastSource).toBe(list);
			expect(observer.countsSeen).toBeArray([1, 2]);
		});

		test("Object removed event: remove", () => {
			let a = new NamedObject("a");
			let list = new ManagedList(a);
			let observer = new ListEventObserver().observe(list);
			list.remove(a);
			expect(observer.removed).toBe(1);
			expect(observer.lastEvent)
				.toHaveProperty("name")
				.toBe("ManagedObjectRemoved");
			expect(observer.lastObject).toBe(a);
			expect(observer.lastSource).toBe(list);
			expect(observer.countsSeen).toBeArray([0]);
		});

		test("Object removed event: unlink attached object", () => {
			let a = new NamedObject("a");
			let list = new ManagedList(a).attachAll(true);
			let observer = new ListEventObserver().observe(list);
			a.unlink();
			expect(observer.removed).toBe(1);
			expect(observer.lastEvent)
				.toHaveProperty("name")
				.toBe("ManagedObjectRemoved");
			expect(observer.lastObject).toBe(a);
			expect(observer.lastSource).toBe(list);
			expect(observer.countsSeen).toBeArray([0]);
		});

		test("Object removed event: move attached object", (t) => {
			let a = new NamedObject("a");
			let list = new ManagedList(a).attachAll(true);
			expect(ManagedObject.whence(a)).toBe(list);
			t.log(list.toArray());
			let other = new ManagedList().attachAll(true);
			let observer = new ListEventObserver().observe(list);
			other.add(a);
			expect(ManagedObject.whence(a)).toBe(other);
			t.log(list.toArray());
			t.log(observer);
			expect(observer.removed).toBe(1);
			expect(observer.lastEvent)
				.toHaveProperty("name")
				.toBe("ManagedObjectRemoved");
			expect(observer.lastObject).toBe(a);
			expect(observer.lastSource).toBe(list);
			expect(observer.countsSeen).toBeArray([0]);
		});

		test("Object added & removed & change event: replace", () => {
			let [a, b, c, d] = [
				new NamedObject("a"),
				new NamedObject("b"),
				new NamedObject("c"),
				new NamedObject("d"),
			];
			let list = new ManagedList(a, b, c);
			let observer = new ListEventObserver().observe(list);
			list.replace([b, a, d]);
			expect(observer.added).toBe(1);
			expect(observer.removed).toBe(1);
			expect(observer.changed).toBe(1);
		});

		test("List change event: clear", () => {
			let a = new NamedObject("a");
			let list = new ManagedList(a);
			let observer = new ListEventObserver().observe(list);
			list.clear();
			expect(observer.removed).toBe(0);
			expect(observer.changed).toBe(1);
			expect(observer.lastEvent)
				.toHaveProperty("name")
				.toBe("ManagedListChange");
			expect(observer.lastSource).toBe(list);
		});

		test("List change event: clear (attached)", () => {
			let a = new NamedObject("a");
			let list = new ManagedList(a).attachAll(true);
			let observer = new ListEventObserver().observe(list);
			list.clear();
			expect(observer.removed).toBe(0);
			expect(observer.changed).toBe(1);
			expect(observer.lastEvent)
				.toHaveProperty("name")
				.toBe("ManagedListChange");
			expect(observer.lastSource).toBe(list);
		});

		test("Count can be bound", () => {
			class MyObject extends ManagedObject {
				constructor() {
					super();
					bound("list.count").bindTo(this, "boundCount");
				}
				boundCount?: number;
			}
			class MyParent extends ManagedObject {
				list = this.attach(new ManagedList());
				object = this.attach(new MyObject());
			}
			let p = new MyParent();
			expect(p.object).toHaveProperty("boundCount").toBe(0);
			p.list.add(new ManagedObject());
			expect(p.object).toHaveProperty("boundCount").toBe(1);
			p.list.first()!.unlink();
			expect(p.object).toHaveProperty("boundCount").toBe(0);
		});
	});
});
