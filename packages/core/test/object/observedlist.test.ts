import { beforeAll, describe, expect, test } from "vitest";
import {
	AppContext,
	bind,
	ObservableEvent,
	ObservableList,
	ObservableObject,
} from "../../dist/index.js";

beforeAll(() => {
	AppContext.setErrorHandler((e) => {
		throw e;
	});
});

/** Class used throughout tests below */
class NamedObject extends ObservableObject {
	constructor(public name: string) {
		super();
	}
	override valueOf() {
		return this.name;
	}
}

describe("Basic adding and removing", () => {
	// define some objects to be used for testing below:
	let a = new NamedObject("a");
	let b = new NamedObject("b");
	let c = new NamedObject("c");

	test("Constructor", () => {
		let list = new ObservableList();
		expect(list).toBeInstanceOf(ObservableList);
		expect(list.length).toBe(0);
	});

	test("Constructor with initial list", () => {
		let list = new ObservableList(a, b, c);
		expect(list.length).toBe(3);
		expect(list.toArray()).toEqual([a, b, c]);
	});

	test("Adding items: add", () => {
		let list = new ObservableList<NamedObject>();
		list.add(a);
		expect(list.length).toBe(1);
		list.add(b, c);
		expect(list.length).toBe(3);

		// test using first, last, toArray
		expect(list.first()).toHaveProperty("name", "a");
		expect(list.last()).toHaveProperty("name", "c");
		expect(list.toArray()).toEqual([a, b, c]);

		// can't add unlinked objects
		let foo = new NamedObject("unlinked").unlink();
		expect(() => list.add(foo)).toThrowError();
	});

	test("Adding items: insert", () => {
		let list = new ObservableList<NamedObject>();
		list.insert(a);
		list.insert(b);
		list.insert(c, a);
		expect(list.length).toBe(3);

		// test using first, last, toArray
		expect(list.first()).toHaveProperty("name", "c");
		expect(list.last()).toHaveProperty("name", "b");
		expect(list.toArray()).toEqual([c, a, b]);

		// can't add before non-existent items
		expect(() =>
			list.insert(new NamedObject(""), new NamedObject("")),
		).toThrowError();
	});

	test("Can't add duplicates", () => {
		let list = new ObservableList<NamedObject>();
		list.insert(a);
		expect(() => list.insert(a)).toThrowError();
	});

	test("Removing first, middle, last elements", () => {
		// removing only element
		let list = new ObservableList(a);
		list.remove(a);
		expect(list.length).toBe(0);
		expect(list.toArray()).toEqual([]);

		// removing head and tail
		list = new ObservableList(a, b, c);
		list.remove(a);
		expect(list.length).toBe(2);
		expect(list.toArray()).toEqual([b, c]);
		list.remove(c);
		expect(list.length).toBe(1);
		expect(list.toArray()).toEqual([b]);
		expect(list.takeLast(10)).toEqual([b]);

		// removing middle element
		list = new ObservableList(a, b, c);
		list.remove(b);
		expect(list.length).toBe(2);
		expect(list.toArray()).toEqual([a, c]);
		expect(list.takeLast(10)).toEqual([a, c]);
	});

	test("Splice: empty result", () => {
		let list = new ObservableList(a, b, c);
		expect(list.splice()).toEqual([]);
		expect(list.splice(undefined, 0)).toEqual([]);
		expect(list.splice(undefined, 3)).toEqual([]);
		expect(list.splice(a, 0)).toEqual([]);

		// doesn't throw if target is not in the list
		expect(list.splice(new NamedObject("d"))).toEqual([]);

		// throws when target is invalid
		expect(() => list.splice({} as any)).toThrowError();
	});

	test("Splice: complete result, empty list (undefined)", () => {
		let list = new ObservableList(a, b, c);
		expect(list.splice(a)).toEqual([a, b, c]);
		expect(list.length).toBe(0);
		expect(list.first() || list.last()).toBeUndefined();
	});

	test("Splice: complete result, empty list (number)", () => {
		let list = new ObservableList(a, b, c);
		expect(list.splice(a, 3)).toEqual([a, b, c]);
		expect(list.length).toBe(0);
		expect(list.first() || list.last()).toBeUndefined();
	});

	test("Splice: partial result, partial list", () => {
		// take from end
		let list = new ObservableList(a, b, c);
		expect(list.splice(b, 2)).toEqual([b, c]);
		expect(list.length).toBe(1);
		expect(list.first()).toBe(a);
		expect(list.last()).toBe(a);

		// take from start
		list = new ObservableList(a, b, c);
		expect(list.splice(a, 2)).toEqual([a, b]);
		expect(list.length).toBe(1);
		expect(list.first()).toBe(c);
		expect(list.last()).toBe(c);

		// take from middle
		list = new ObservableList(a, b, c);
		expect(list.splice(b, 1)).toEqual([b]);
		expect(list.length).toBe(2);
		expect(list.toArray()).toEqual([a, c]);
		expect(list.last()).toBe(c);
	});

	test("Splice: insert without removing", () => {
		// insert at end
		let list = new ObservableList(a, b);
		expect(list.splice(undefined, 0, c)).toEqual([]);
		expect(list.length).toBe(3);
		expect(list.toArray()).toEqual([a, b, c]);
		expect(list.last()).toBe(c);

		// insert at start
		list = new ObservableList(b, c);
		expect(list.splice(b, 0, a)).toEqual([]);
		expect(list.length).toBe(3);
		expect(list.toArray()).toEqual([a, b, c]);
		expect(list.first()).toBe(a);

		// insert in middle
		list = new ObservableList(a, c);
		expect(list.splice(c, 0, b)).toEqual([]);
		expect(list.length).toBe(3);
		expect(list.toArray()).toEqual([a, b, c]);
	});

	test("Splice: remove and insert", () => {
		let d = new NamedObject("d");

		// remove end (undefined)
		let list = new ObservableList(a, b, c);
		expect(list.splice(c, undefined, d)).toEqual([c]);
		expect(list.length).toBe(3);
		expect(list.toArray()).toEqual([a, b, d]);
		expect(list.last()).toBe(d);

		// remove end (specific)
		list = new ObservableList(a, b, c);
		expect(list.splice(c, 1, d)).toEqual([c]);
		expect(list.length).toBe(3);
		expect(list.toArray()).toEqual([a, b, d]);
		expect(list.last()).toBe(d);

		// remove start
		list = new ObservableList(a, b, c);
		expect(list.splice(a, 1, d)).toEqual([a]);
		expect(list.length).toBe(3);
		expect(list.toArray()).toEqual([d, b, c]);
		expect(list.first()).toBe(d);

		// remove middle
		list = new ObservableList(a, b, c);
		expect(list.splice(b, 1, d)).toEqual([b]);
		expect(list.length).toBe(3);
		expect(list.toArray()).toEqual([a, d, c]);

		// remove and put back
		list = new ObservableList(a, b, c);
		expect(list.splice(b, 1, d, b)).toEqual([b]);
		expect(list.length).toBe(4);
		expect(list.toArray()).toEqual([a, d, b, c]);
	});

	test("Splice: string value as number", () => {
		let list = new ObservableList(a, b, c);
		expect(list.splice(a, "2" as any)).toEqual([a, b]);
		expect(list.length).toBe(1);
		expect(list.first()).toBe(c);
		expect(list.last()).toBe(c);
	});

	test("Replace: single object", () => {
		let list = new ObservableList(a, b, c);
		let d = new NamedObject("d");
		let e = new NamedObject("e");
		list.replaceObject(b, d);
		expect(list.length).toBe(3);
		expect(list.toArray()).toEqual([a, d, c]);
		list.replaceObject(d, e);
		expect(list.toArray()).toEqual([a, e, c]);
	});

	test("Replace: insert only", () => {
		let list = new ObservableList<NamedObject>();
		list.replaceAll([a, b, undefined, , null as any, c]); // gaps
		expect(list.length).toBe(3);
		expect(list.toArray()).toEqual([a, b, c]);
	});

	test("Replace: remove only", () => {
		let list = new ObservableList(a, b, c);
		list.replaceAll([]);
		expect(list.length).toBe(0);
		expect(list.toArray()).toEqual([]);
	});

	test("Replace: move only", () => {
		let list = new ObservableList(a, b, c);
		list.replaceAll([c, b, a]);
		expect(list.length).toBe(3);
		expect(list.toArray()).toEqual([c, b, a]);
		expect(list.takeLast(3)).toEqual([c, b, a]);
		list.replaceAll([c, b, a]);
		list.replaceAll([b, c, a]);
		expect(list.length).toBe(3);
		expect(list.toArray()).toEqual([b, c, a]);
		expect(list.takeLast(3)).toEqual([b, c, a]);
	});

	test("Replace: complete", () => {
		let items: NamedObject[] = [];
		for (let i = 0; i < 10; i++) {
			items.push(new NamedObject(String(i)));
		}
		let list = new ObservableList(items[0]!, items[1]!, items[2]!);
		let order = [6, 7, 8, 9, 1, 3, 4, 0, 5];
		list.replaceAll(order.map((i) => items[i]));
		expect(list.map((o) => +o.name)).toEqual(order);
	});

	test("Clearing list: clear", () => {
		let list = new ObservableList(a, b, c);
		list.clear();
		expect(list.length).toBe(0);
		expect(list.toArray()).toEqual([]);
		expect(list.takeLast(1)).toEqual([]);

		// clearing again should do nothing
		list.clear();
		expect(list.first()).toBeUndefined();
		expect(list.last()).toBeUndefined();
	});

	test("Clearing list: unlink", () => {
		let list = new ObservableList(a, b, c);
		list.unlink();
		expect(list.length).toBe(0);
		expect(list.toArray()).toEqual([]);
		expect(list.takeLast(1)).toEqual([]);

		// check methods throwing errors
		expect(() => list.clear()).not.toThrowError();
		expect(() => list.remove(a)).not.toThrowError();
		expect(() => list.add(a)).toThrowError();
		expect(() => list.splice(a)).toThrowError();
		expect(() => list.replaceAll([])).toThrowError();
		expect(() => list.reverse()).toThrowError();
		expect(list.get(0)).toBeUndefined();
		expect(list.take(3)).toEqual([]);
		expect(list.takeLast(3)).toEqual([]);
		expect(list.indexOf(a)).toBe(-1);
		expect(list.includes(a)).toBeFalsy();
		expect(() => list.add(new NamedObject(""))).toThrowError();
		let fExpect = expect(() => {
			let i = 0;
			for (let _t of list) i++;
			return i;
		});
		fExpect.not.toThrowError();
		fExpect.toBe(0);
		expect(list.map(() => {})).toEqual([]);
		expect(list.find(() => {})).toBe(undefined);
		expect(list.some(() => {})).toBe(false);
		expect(list.every(() => {})).toBe(true);
	});

	test("Reverse", () => {
		let list = new ObservableList(a, b, c);
		let array = list.toArray();
		array.reverse();
		list.reverse();
		expect(list.first()).toBe(c);
		expect(list.last()).toBe(a);
		expect(list.toArray()).toEqual(array);
		expect(list.takeLast(3)).toEqual(array);
	});

	test("Sort", () => {
		let list = new ObservableList(c, a, b);
		list.sort((a, b) => a.name.localeCompare(b.name));
		expect(list.toArray()).toEqual([a, b, c]);
		list.sort((a, b) => b.name.localeCompare(a.name));
		expect(list.toArray()).toEqual([c, b, a]);
	});

	test("Restrict by class", () => {
		let list = new ObservableList().restrict(NamedObject);
		expect(() => list.add({ fails: true } as any)).toThrowError();
		expect(() => list.add(new ObservableObject() as any)).toThrowError();
		expect(() => list.add(new NamedObject("a"))).not.toThrowError();

		let abcList = new ObservableList<any>(a, b, c);
		class OtherClass extends ObservableObject {}
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
		let list1 = new ObservableList<NamedObject>();
		list1.add(...objects);

		let list2 = new ObservableList<NamedObject>();
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

	test("Iterable iterator (objects)", () => {
		let [list1, list2, orig] = makeLists();

		console.log("list1...");
		let i = 0;
		for (let t of list1) expect(t).toBe(orig[i++]);
		expect(i).toBe(orig.length);

		console.log("list2...");
		i = 0;
		for (let t of list2) expect(t).toBe(orig[i++]);
		expect(i).toBe(orig.length);

		console.log("list2.objects...");
		let iter = list2.objects();
		i = 0;
		for (let t of iter) expect(t).toBe(orig[i++]);
		expect(i).toBe(orig.length);
	});

	test("get", () => {
		let [list1, list2] = makeLists();
		expect(list1.get(0)).toHaveProperty("name", "a");
		expect(list1.get(1)).toHaveProperty("name", "b");
		expect(list1.get(2)).toHaveProperty("name", "c");
		expect(list1.get(3)).toHaveProperty("name", "d");
		expect(list1.get(4)).toHaveProperty("name", "e");

		expect(list2.get(0)).toHaveProperty("name", "a");
		expect(list2.get(1)).toHaveProperty("name", "b");
		expect(list2.get(2)).toHaveProperty("name", "c");
		expect(list2.get(3)).toHaveProperty("name", "d");
		expect(list2.get(4)).toHaveProperty("name", "e");

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
		expect(list1.take(0)).toEqual([]);
		expect(list2.take(0)).toEqual([]);

		// take 5 (max) from start
		expect(list1.take(5)).toEqual(orig);
		expect(list2.take(5)).toEqual(orig);
		expect(list1.take(500)).toEqual(orig);
		expect(list2.take(500)).toEqual(orig);

		// take 3 (max) from third element
		expect(list1.take(3, fromC[0])).toEqual(fromC);
		expect(list2.take(3, fromC[0])).toEqual(fromC);
		expect(list1.take(500, fromC[0])).toEqual(fromC);
		expect(list2.take(500, fromC[0])).toEqual(fromC);

		// if startingFrom not in list, returns empty array
		expect(list1.take(5, new NamedObject("f"))).toEqual([]);
		expect(list2.take(5, new NamedObject("f"))).toEqual([]);
	});

	test("takeLast", () => {
		let [list1, list2, orig] = makeLists();
		let untilC = orig.slice(0, 3);

		// take zero elements: empty array
		expect(list1.takeLast(0)).toEqual([]);
		expect(list2.takeLast(0)).toEqual([]);

		// take 5 (max) until end
		expect(list1.takeLast(5)).toEqual(orig);
		expect(list2.takeLast(5)).toEqual(orig);
		expect(list1.takeLast(500)).toEqual(orig);
		expect(list2.takeLast(500)).toEqual(orig);

		// take 3 (max) until third element
		expect(list1.takeLast(3, untilC[2])).toEqual(untilC);
		expect(list2.takeLast(3, untilC[2])).toEqual(untilC);
		expect(list1.takeLast(500, untilC[2])).toEqual(untilC);
		expect(list2.takeLast(500, untilC[2])).toEqual(untilC);

		// if endingAt not in list, returns empty array
		expect(list1.takeLast(5, new NamedObject("f"))).toEqual([]);
		expect(list2.takeLast(5, new NamedObject("f"))).toEqual([]);
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
			expect(list1.find((t) => t.name === s)).toHaveProperty("name", s);
			expect(list2.find((t) => t.name === s)).toHaveProperty("name", s);
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

	test("filter", () => {
		let [list] = makeLists();
		for (let s of ["a", "b", "c", "d", "e"])
			expect(list.filter((t) => t.name === s)).toHaveLength(1);
		expect(list.filter(() => false)).toEqual([]);
	});

	test("every", () => {
		let [list] = makeLists();
		for (let s of ["a", "b", "c", "d", "e"])
			expect(list.every((t) => t.name !== s)).toBeFalsy();
		expect(list.every(() => true)).toBeTruthy();
	});

	test("forEach", () => {
		let [list] = makeLists();
		let result: any[] = [];
		list.forEach((t) => result.push(t.name));
		expect(result).toEqual(["a", "b", "c", "d", "e"]);
	});

	test("map", () => {
		let [list1, list2, orig] = makeLists();
		expect(list1.map((o) => o)).toEqual(orig);
		expect(list2.map((o) => o)).toEqual(orig);
	});

	test("toArray and toJSON", () => {
		let [list1, list2, orig] = makeLists();
		expect(list1.toArray()).toEqual(orig);
		expect(list2.toArray()).toEqual(orig);
		expect(list2.toJSON()).toEqual(orig);
		expect(list2.toJSON()).toEqual(orig);
		expect(new ObservableList().toArray()).toEqual([]);
		expect(new ObservableList().toJSON()).toEqual([]);
	});

	test("Removing objects from an iterator", () => {
		let [list] = makeLists();
		for (let t of list) {
			list.remove(t);
		}
		expect(list.length).toBe(0);
		expect(list.toArray()).toEqual([]);
		expect(list.takeLast(1)).toEqual([]);
	});

	test("Inserting objects from an iterator", () => {
		let [list] = makeLists();
		let a = list.first()!;
		list.remove(a);
		for (let t of list) {
			if (t.name === "d") list.insert(a, t);
		}
		expect(list.map((a) => a.name)).toEqual(["b", "c", "a", "d", "e"]);
	});

	test("Clearing in the middle of an iterator", () => {
		let [list] = makeLists();
		let result: any[] = [];
		for (let t of list) {
			result.push(t.name);
			if (t.name === "c") list.clear();
		}
		expect(result).toEqual(["a", "b", "c"]);
	});
});

// ------------------------------------------------------
describe("Attachment", () => {
	test("Objects are attached when list is attached", () => {
		let a = new NamedObject("a");
		let list = new ObservableList(a);
		expect(ObservableObject.whence(a)).toBeUndefined();
		let parent = new ObservableList().attachItems(true);
		parent.add(list.attachItems(true));
		expect(ObservableObject.whence(list)).toBe(parent);
		expect(ObservableObject.whence(a)).toBe(list);
		let b = new NamedObject("b");
		list.add(b);
		expect(ObservableObject.whence(b)).toBe(list);
	});

	test("Override auto attach", () => {
		let list = new ObservableList().attachItems(false);
		let a = new NamedObject("a");
		list.add(a);
		expect(ObservableObject.whence(a)).toBeUndefined();
		let parent = new ObservableList().attachItems(true);
		parent.add(list);
		expect(ObservableObject.whence(list)).toBe(parent);
		expect(ObservableObject.whence(a)).toBeUndefined();
		let b = new NamedObject("b");
		list.add(b);
		expect(ObservableObject.whence(b)).toBeUndefined();
	});

	test("Can't override with existing objects", () => {
		let a = new NamedObject("a");
		let list = new ObservableList(a).attachItems(true);
		let parent = new ObservableList().attachItems(true);
		parent.add(list);
		expect(() => list.attachItems(false)).toThrowError();
	});

	test("Attached objects, before adding", () => {
		let list = new ObservableList().attachItems(true);
		let a = new NamedObject("a");
		list.add(a);
		expect(ObservableObject.whence(a)).toBe(list);
	});

	test("Attached objects, after adding", () => {
		let a = new NamedObject("a");
		let list = new ObservableList(a).attachItems(true);
		expect(ObservableObject.whence(a)).toBe(list);
	});

	test("Attached objects are unlinked when removed: remove", () => {
		let a = new NamedObject("a");
		let list = new ObservableList(a).attachItems(true);
		list.remove(a);
		expect(a.isUnlinked()).toBeTruthy();
	});

	test("Attached objects are unlinked when removed: clear", () => {
		let a = new NamedObject("a");
		let list = new ObservableList(a).attachItems(true);
		list.clear();
		expect(a.isUnlinked()).toBeTruthy();
	});

	test("Attached objects are unlinked when removed: unlink", () => {
		let a = new NamedObject("a");
		let list = new ObservableList(a).attachItems(true);
		list.unlink();
		expect(a.isUnlinked()).toBeTruthy();
	});

	test("Objects aren't unlinked when not attached: remove", () => {
		let a = new NamedObject("a");
		let list = new ObservableList(a).attachItems(false);
		list.remove(a);
		expect(a.isUnlinked()).toBeFalsy();
	});

	test("Objects aren't unlinked when not attached: clear", () => {
		let a = new NamedObject("a");
		let list = new ObservableList(a).attachItems(false);
		list.clear();
		expect(a.isUnlinked()).toBeFalsy();
	});

	test("Objects aren't unlinked when not attached: unlink", () => {
		let a = new NamedObject("a");
		let list = new ObservableList(a).attachItems(false);
		list.unlink();
		expect(a.isUnlinked()).toBeFalsy();
	});

	test("Attached objects are moved using replace", () => {
		let a = new NamedObject("a");
		let b = new NamedObject("b");
		let list = new ObservableList(a, b).attachItems(true);
		list.replaceAll([b, a]);
		expect(a.isUnlinked()).toBeFalsy();
		expect(b.isUnlinked()).toBeFalsy();
	});

	test("Attached objects can be moved to another list", () => {
		let a = new NamedObject("a");
		let b = new NamedObject("b");
		let list1 = new ObservableList(a, b).attachItems(true);
		let list2 = new ObservableList().attachItems(true);
		list2.add(a);
		expect(list1.length).toBe(1);
		expect(list2.length).toBe(1);
		expect(a.isUnlinked()).toBeFalsy();
		expect(b.isUnlinked()).toBeFalsy();
		expect(ObservableObject.whence(a)).toBe(list2);
		expect(ObservableObject.whence(b)).toBe(list1);
	});

	test("Remove attached object when unlinked", () => {
		let a = new NamedObject("a");
		let list = new ObservableList(a).attachItems(true);
		expect(ObservableObject.whence(a)).toBe(list);
		a.unlink();
		expect(ObservableObject.whence(a)).toBeUndefined();
		expect(list.length).toBe(0);
		expect(list.includes(a)).toBeFalsy();
	});

	test("Attached objects are unlinked when attached list unlinked", () => {
		let unlinked = 0;
		class MyChild extends ObservableObject {
			override beforeUnlink() {
				unlinked++;
			}
		}
		class MyParent extends ObservableObject {
			list = this.attach(
				new ObservableList(new MyChild(), new MyChild(), new MyChild()),
			).attachItems(true);
		}
		let p = new MyParent();
		p.unlink();
		expect(unlinked).toBe(3);
	});
});

// ------------------------------------------------------
describe("Events and observation", () => {
	class ListEventObserver {
		constructor(list: ObservableList) {
			list.listen(this);
		}

		added = 0;
		removed = 0;
		changed = 0;
		lastEvent?: ObservableEvent;
		lastObject?: any;
		lastSource?: any;
		countsSeen: number[] = [];

		handler(list: ObservableList, event: any) {
			this.lastEvent = event;
			this.lastSource = event.source;
			this.countsSeen.push(list.length || 0);
			if (event.name === "Change") this.changed++;
			if (event.name === "Add") {
				this.added++;
				this.lastObject = event.data.added;
			}
			if (event.name === "Remove") {
				this.removed++;
				this.lastObject = event.data.removed;
			}
		}
	}

	test("Object added event: add, insert", () => {
		let list = new ObservableList();
		let observer = new ListEventObserver(list);
		let a = new NamedObject("a");
		list.add(a);
		let b = new NamedObject("b");
		list.insert(b, a);
		expect(observer.added).toBe(2);
		expect(observer.removed).toBe(0);
		expect(observer.changed).toBe(0);
		expect(observer.lastEvent).toHaveProperty("name", "Add");
		expect(observer.lastObject).toBe(b);
		expect(observer.lastSource).toBe(list);
		expect(observer.countsSeen).toEqual([1, 2]);
	});

	test("Object removed event: remove", () => {
		let a = new NamedObject("a");
		let list = new ObservableList(a);
		let observer = new ListEventObserver(list);
		list.remove(a);
		expect(observer.removed).toBe(1);
		expect(observer.lastEvent).toHaveProperty("name", "Remove");
		expect(observer.lastObject).toBe(a);
		expect(observer.lastSource).toBe(list);
		expect(observer.countsSeen).toEqual([0]);
	});

	test("Object removed event: unlink attached object", () => {
		let a = new NamedObject("a");
		let list = new ObservableList(a).attachItems(true);
		let observer = new ListEventObserver(list);
		a.unlink();
		expect(observer.removed).toBe(1);
		expect(observer.lastEvent).toHaveProperty("name", "Remove");
		expect(observer.lastObject).toBe(a);
		expect(observer.lastSource).toBe(list);
		expect(observer.countsSeen).toEqual([0]);
	});

	test("Object removed event: move attached object", () => {
		let a = new NamedObject("a");
		let list = new ObservableList(a).attachItems(true);
		expect(ObservableObject.whence(a)).toBe(list);
		console.log(list.toArray());
		let other = new ObservableList().attachItems(true);
		let observer = new ListEventObserver(list);
		other.add(a);
		expect(ObservableObject.whence(a)).toBe(other);
		console.log(list.toArray());
		console.log(observer);
		expect(observer.removed).toBe(1);
		expect(observer.lastEvent).toHaveProperty("name", "Remove");
		expect(observer.lastObject).toBe(a);
		expect(observer.lastSource).toBe(list);
		expect(observer.countsSeen).toEqual([0]);
	});

	test("Object added & removed & change event: replace", () => {
		let [a, b, c, d] = [
			new NamedObject("a"),
			new NamedObject("b"),
			new NamedObject("c"),
			new NamedObject("d"),
		];
		let list = new ObservableList(a, b, c);
		let observer = new ListEventObserver(list);
		list.replaceAll([b, a, d]);
		expect(observer.added).toBe(1);
		expect(observer.removed).toBe(1);
		expect(observer.changed).toBe(1);
	});

	test("List change event: clear", () => {
		let a = new NamedObject("a");
		let list = new ObservableList(a);
		let observer = new ListEventObserver(list);
		list.clear();
		expect(observer.removed).toBe(0);
		expect(observer.changed).toBe(1);
		expect(observer.lastEvent).toHaveProperty("name", "Change");
		expect(observer.lastSource).toBe(list);
	});

	test("List change event: clear (attached)", () => {
		let a = new NamedObject("a");
		let list = new ObservableList(a).attachItems(true);
		let observer = new ListEventObserver(list);
		list.clear();
		expect(observer.removed).toBe(0);
		expect(observer.changed).toBe(1);
		expect(observer.lastEvent).toHaveProperty("name", "Change");
		expect(observer.lastSource).toBe(list);
	});

	test("Count can be bound", () => {
		class MyObject extends ObservableObject {
			constructor() {
				super();
				this.observe(bind("list.length"), (v: any) => {
					this.boundCount = v;
				});
			}
			boundCount?: number;
		}
		class MyParent extends ObservableObject {
			list = this.attach(new ObservableList().attachItems(true));
			object = this.attach(new MyObject());
		}
		let p = new MyParent();
		expect(p.object).toHaveProperty("boundCount", 0);
		p.list.add(new ObservableObject());
		expect(p.object).toHaveProperty("boundCount", 1);
		p.list.first()!.unlink();
		expect(p.object).toHaveProperty("boundCount", 0);
	});
});
