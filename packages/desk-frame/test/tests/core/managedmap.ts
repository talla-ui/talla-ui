import {
	bound,
	ManagedEvent,
	ManagedMap,
	ManagedObject,
	Observer,
} from "../../../dist/index.js";
import { describe, expect, test } from "@desk-framework/test";

describe("ManagedMap", () => {
	describe("Basics", () => {
		class NamedObject extends ManagedObject {
			constructor(public name: string) {
				super();
			}
		}

		function mapWithAbc() {
			let map = new ManagedMap();
			map.set("a", new NamedObject("a"));
			map.set("b", new NamedObject("b"));
			map.set("c", new NamedObject("c"));
			return map;
		}

		test("Constructor and count", () => {
			let map = mapWithAbc();
			expect(map.count).toBe(3);
		});

		test("Iterator", () => {
			let map = mapWithAbc();
			let keys = "";
			for (let [k, v] of map) {
				keys += k;
				expect(v).toHaveProperty("name").toBe(k);
			}
			expect(keys).toBe("abc");
		});

		test("Set, get, has single key", () => {
			let map = mapWithAbc();
			expect(map.has("a")).toBeTruthy();
			expect(map.has("b")).toBeTruthy();
			expect(map.has("c")).toBeTruthy();
			expect(map.get("a")).toHaveProperty("name").toBe("a");
			expect(map.get("b")).toHaveProperty("name").toBe("b");
			expect(map.get("c")).toHaveProperty("name").toBe("c");
		});

		test("Set, get, has with different key type", () => {
			let map1 = new ManagedMap<number>();
			map1.set(1, new NamedObject("1"));
			expect(map1.has(1)).toBeTruthy();
			expect(map1.get(1)).toHaveProperty("name").toBe("1");
			expect(map1.has("1" as any)).toBeFalsy();

			let map2 = new ManagedMap<ManagedObject>();
			let a = new NamedObject("a");
			let b = new NamedObject("b");
			map2.set(a, a);
			expect(map2.has(a)).toBeTruthy();
			expect(map2.get(a)).toHaveProperty("name").toBe("a");
			expect(map2.has(b)).toBeFalsy();
			map2.set(a, b);
			expect(map2.get(a)).toHaveProperty("name").toBe("b");
		});

		test("Should not accept non-ManagedObject values", () => {
			let map = new ManagedMap();
			expect(() => map.set("a", { fails: true } as any)).toThrowError();
		});

		test("Fails with unlinked values", () => {
			let map = new ManagedMap();
			let a = new NamedObject("a");
			a.unlink();
			expect(() => map.set("a", a)).toThrowError();
			map.unlink();
			let b = new NamedObject("b");
			expect(() => map.set("b", b)).toThrowError();

			// removing objects is fine, won't do anything
			expect(() => map.unset("b")).not.toThrowError();
			expect(() => map.remove(b)).not.toThrowError();
			expect(() => map.clear()).not.toThrowError();
		});

		test("Restrict by class", () => {
			let map = new ManagedMap().restrict(NamedObject);
			expect(() => map.set("a", { fails: true } as any)).toThrowError();
			expect(() => map.set("a", new ManagedObject() as any)).toThrowError();
			expect(() => map.set("a", new NamedObject("a"))).not.toThrowError();

			let abcMap = mapWithAbc();
			class OtherClass extends ManagedObject {}
			expect(() => abcMap.restrict(OtherClass)).toThrowError();
			expect(() => abcMap.restrict(NamedObject)).not.toThrowError();
		});

		test("Includes, unset", () => {
			let map = mapWithAbc();
			let a = map.get("a")!;
			expect(a).toHaveProperty("name").toBe("a");
			expect(map.includes(a)).toBeTruthy();
			expect(map.includes(new ManagedObject())).toBeFalsy();
			map.unset("a");
			expect(map.count).toBe(2);
			expect(map.includes(a)).toBeFalsy();
			expect(() => map.unset("d")).not.toThrowError();
			expect(() => map.unset("")).not.toThrowError();
			expect(() => map.unset(undefined as any)).not.toThrowError();
			expect(() => map.unset(null as any)).not.toThrowError();
			expect(map.count).toBe(2);
		});

		test("Remove, clear", () => {
			let map = mapWithAbc();
			let a = map.get("a")!;
			map.remove(a);
			expect(map.count).toBe(2);
			expect(map.includes(a)).toBeFalsy();
			expect(map.get("a")).toBeUndefined();
			let b = map.get("b")!;
			map.clear();
			expect(map.count).toBe(0);
			expect(map.includes(b)).toBeFalsy();
			expect(map.get("b")).toBeUndefined();
		});

		test("Objects, keys, toObject, toJSON", () => {
			let map = mapWithAbc();
			expect([...map.objects()].map((o: any) => o.name).join()).toBe("a,b,c");
			expect([...map.keys()]).toBeArray(["a", "b", "c"]);
			expect(map.toObject())
				.toHaveProperty("a")
				.toHaveProperty("name")
				.toBe("a");
			expect(map.toJSON()) // exact same method
				.toHaveProperty("a")
				.toHaveProperty("name")
				.toBe("a");
		});

		test("Map is cleared when unlinked", () => {
			let map = mapWithAbc();
			map.unlink();
			expect(map.count).toBe(0);
			expect(map.get("a")).toBeUndefined();
		});
	});

	// ------------------------------------------------------
	describe("Attachment", () => {
		test("Objects are attached when map is attached", () => {
			let map = new ManagedMap();
			let a = new ManagedObject();
			map.set("a", a);
			expect(ManagedObject.whence(a)).toBeUndefined();
			let parent = new ManagedMap().autoAttach(true);
			parent.set("map", map);
			expect(ManagedObject.whence(map)).toBe(parent);
			expect(ManagedObject.whence(a)).toBe(map);
			let b = new ManagedObject();
			map.set("b", b);
			expect(ManagedObject.whence(b)).toBe(map);
		});

		test("Override auto attach", () => {
			let map = new ManagedMap().autoAttach(false);
			let a = new ManagedObject();
			map.set("a", a);
			expect(ManagedObject.whence(a)).toBeUndefined();
			let parent = new ManagedMap().autoAttach(true);
			parent.set("map", map);
			expect(ManagedObject.whence(map)).toBe(parent);
			expect(ManagedObject.whence(a)).toBeUndefined();
			let b = new ManagedObject();
			map.set("b", b);
			expect(ManagedObject.whence(b)).toBeUndefined();
		});

		test("Can't override with existing objects", () => {
			let map = new ManagedMap();
			let parent = new ManagedMap().autoAttach(true);
			parent.set("map", map);
			map.set("a", new ManagedObject());
			expect(() => map.autoAttach(false)).toThrowError();
		});

		test("Attached objects, before setting", () => {
			let map = new ManagedMap().autoAttach(true);
			let a = new ManagedObject();
			map.set("a", a);
			expect(ManagedObject.whence(a)).toBe(map);
		});

		test("Attached objects, after setting", () => {
			let map = new ManagedMap();
			let a = new ManagedObject();
			map.set("a", a);
			map.autoAttach(true);
			expect(ManagedObject.whence(a)).toBe(map);
		});

		test("If attached, do not allow duplicates", () => {
			let map = new ManagedMap().autoAttach(true);
			let a = new ManagedObject();
			map.set("a", a);
			expect(() => map.set("b", a)).toThrowError();
		});

		test("If attached, unlink before setting other", () => {
			let map = new ManagedMap().autoAttach(true);
			let a = new ManagedObject();
			map.set("a", a);
			map.set("a", new ManagedObject());
			expect(a.isUnlinked()).toBeTruthy();

			// but not if same object:
			let b = new ManagedObject();
			map.set("b", b);
			map.set("b", b);
			expect(b.isUnlinked()).toBeFalsy();
		});

		test("Do not allow attach if map has duplicates", () => {
			let map = new ManagedMap();
			let a = new ManagedObject();
			map.set("a", a);
			map.set("b", a);
			expect(() => map.autoAttach(true)).toThrowError();
		});

		test("Attached objects are unlinked when removed: unset", () => {
			let map = new ManagedMap().autoAttach(true);
			let a = new ManagedObject();
			map.set("a", a);
			map.unset("a");
			expect(a.isUnlinked()).toBeTruthy();
		});

		test("Attached objects are unlinked when removed: remove", () => {
			let map = new ManagedMap().autoAttach(true);
			let a = new ManagedObject();
			map.set("a", a);
			map.remove(a);
			expect(a.isUnlinked()).toBeTruthy();
		});

		test("Attached objects are unlinked when removed: clear", () => {
			let map = new ManagedMap().autoAttach(true);
			let a = new ManagedObject();
			map.set("b", new ManagedObject());
			map.set("a", a);
			map.clear();
			expect(a.isUnlinked()).toBeTruthy();
		});

		test("Attached objects are unlinked when removed: unlink", () => {
			let map = new ManagedMap().autoAttach(true);
			let a = new ManagedObject();
			map.set("b", new ManagedObject());
			map.set("a", a);
			map.unlink();
			expect(a.isUnlinked()).toBeTruthy();
		});

		test("Objects aren't unlinked when not attached: unset", () => {
			let map = new ManagedMap().autoAttach(false);
			let a = new ManagedObject();
			map.set("a", a);
			map.unset("a");
			expect(a.isUnlinked()).toBeFalsy();
		});

		test("Objects aren't unlinked when not attached: remove", () => {
			let map = new ManagedMap().autoAttach(false);
			let a = new ManagedObject();
			map.set("a", a);
			map.remove(a);
			expect(a.isUnlinked()).toBeFalsy();
		});

		test("Objects aren't unlinked when not attached: clear", () => {
			let map = new ManagedMap().autoAttach(false);
			let a = new ManagedObject();
			map.set("a", a);
			map.clear();
			expect(a.isUnlinked()).toBeFalsy();
		});

		test("Objects aren't unlinked when not attached: unlink", () => {
			let map = new ManagedMap().autoAttach(false);
			let a = new ManagedObject();
			map.set("a", a);
			map.unlink();
			expect(a.isUnlinked()).toBeFalsy();
		});

		test("Attached objects can be moved to other map", () => {
			// note: objects can't be moved in same map (duplicates, see above)
			let map = new ManagedMap().autoAttach(true);
			let other = new ManagedMap().autoAttach(true);
			let a = new ManagedObject();
			map.set("a", a);
			other.set("a'", a);
			expect(ManagedObject.whence(a)).toBe(other);
			expect(map.has("a")).toBeFalsy();
			map.set("b", a); // move back, different property
			expect(ManagedObject.whence(a)).toBe(map);
			expect(other.has("a")).toBeFalsy();
		});

		test("Remove attached object when unlinked", () => {
			let map = new ManagedMap().autoAttach(true);
			let a = new ManagedObject();
			map.set("a", a);
			expect(ManagedObject.whence(a)).toBe(map);
			a.unlink();
			expect(ManagedObject.whence(a)).toBeUndefined();
			expect(map.get("a")).toBeUndefined();
		});

		test("Attached objects are unlinked when attached map unlinked", (t) => {
			class MyChild extends ManagedObject {
				override beforeUnlink() {
					t.count("unlink");
				}
			}
			class MyParent extends ManagedObject {
				map = this.attach(new ManagedMap());
			}
			let p = new MyParent();
			p.map.set("a", new MyChild());
			p.map.set("b", new MyChild());
			p.map.set("c", new MyChild());
			p.unlink();
			t.expectCount("unlink").toBe(3);
		});
	});

	// ------------------------------------------------------
	describe("Events and observation", () => {
		class MapEventObserver extends Observer<ManagedMap> {
			added = 0;
			removed = 0;
			changed = 0;
			lastEvent?: ManagedEvent;
			lastObject?: any;
			lastSource?: any;
			lastKey?: any;
			countsSeen: number[] = [];
			protected override handleEvent(event: any) {
				this.lastEvent = event;
				this.lastSource = event.source;
				this.countsSeen.push(this.observed?.count || 0);
				if (event.name === "ManagedObjectAdded") this.added++;
				if (event.name === "ManagedObjectRemoved") this.removed++;
				if (event.name === "ManagedMapChange") this.changed++;
				if (event.data) {
					if ("key" in event.data) this.lastKey = event.data.key;
					if ("object" in event.data) this.lastObject = event.data.object;
				}
			}
		}

		test("Object added event: set", () => {
			let map = new ManagedMap();
			let observer = new MapEventObserver().observe(map);
			let a = new ManagedObject();
			map.set("a", a);
			expect(observer.added).toBe(1);
			expect(observer.removed).toBe(0);
			expect(observer.changed).toBe(0);
			expect(observer.lastEvent)
				.toHaveProperty("name")
				.toBe("ManagedObjectAdded");
			expect(observer.lastKey).toBe("a");
			expect(observer.lastObject).toBe(a);
			expect(observer.lastSource).toBe(map);
			expect(observer.countsSeen).toBeArray([1]);
		});

		test("Object added & removed event: set", () => {
			let map = new ManagedMap();
			let observer = new MapEventObserver().observe(map);
			let a = new ManagedObject();
			map.set("a", a);
			map.set("a", a);
			let b = new ManagedObject();
			map.set("a", b);
			expect(observer.added).toBe(2);
			expect(observer.removed).toBe(1);
			expect(observer.changed).toBe(0);
			expect(observer.lastObject).toBe(b);
			expect(observer.countsSeen).toBeArray([1, 1, 1]);
		});

		test("Object removed event: unset", () => {
			let map = new ManagedMap();
			let observer = new MapEventObserver().observe(map);
			let a = new ManagedObject();
			map.set("a", a);
			map.unset("a");
			expect(observer.removed).toBe(1);
			expect(observer.lastEvent)
				.toHaveProperty("name")
				.toBe("ManagedObjectRemoved");
			expect(observer.lastKey).toBe("a");
			expect(observer.lastObject).toBe(a);
			expect(observer.lastSource).toBe(map);
			expect(observer.countsSeen).toBeArray([1, 0]);
		});

		test("Object removed event: remove", () => {
			let map = new ManagedMap();
			let observer = new MapEventObserver().observe(map);
			let a = new ManagedObject();
			map.set("a", a);
			map.set("b", a);
			map.remove(a);
			expect(observer.removed).toBe(2);
			expect(observer.lastKey).toBeOneOf("a", "b");
			expect(observer.lastObject).toBe(a);
			expect(observer.lastSource).toBe(map);
			expect(observer.countsSeen).toBeArray([1, 2, 0, 0]);
		});

		test("Object removed event: unlink attached object", () => {
			let map = new ManagedMap().autoAttach(true);
			let observer = new MapEventObserver().observe(map);
			let a = new ManagedObject();
			map.set("a", a);
			a.unlink();
			expect(observer.removed).toBe(1);
			expect(observer.lastKey).toBe("a");
			expect(observer.lastObject).toBe(a);
			expect(observer.lastSource).toBe(map);
			expect(observer.countsSeen).toBeArray([1, 0]);
		});

		test("Object removed event: move attached object", () => {
			let map = new ManagedMap().autoAttach(true);
			let other = new ManagedMap().autoAttach(true);
			let observer = new MapEventObserver().observe(map);
			let a = new ManagedObject();
			map.set("a", a);
			other.set("a", a);
			expect(observer.removed).toBe(1);
			expect(observer.lastKey).toBe("a");
			expect(observer.lastObject).toBe(a);
			expect(observer.lastSource).toBe(map);
			expect(observer.countsSeen).toBeArray([1, 0]);
		});

		test("Map change event: clear", () => {
			let map = new ManagedMap();
			let observer = new MapEventObserver().observe(map);
			let a = new ManagedObject();
			map.set("a", a);
			map.set("b", a);
			map.clear();
			expect(observer.removed).toBe(0);
			expect(observer.changed).toBe(1);
			expect(observer.lastSource).toBe(map);
			expect(observer.countsSeen).toBeArray([1, 2, 0]);
		});

		test("Map change event: clear (attached)", () => {
			let map = new ManagedMap().autoAttach(true);
			let observer = new MapEventObserver().observe(map);
			let a = new ManagedObject();
			map.set("a", a);
			map.clear();
			expect(observer.removed).toBe(0);
			expect(observer.changed).toBe(1);
			expect(observer.lastSource).toBe(map);
			expect(observer.countsSeen).toBeArray([1, 0]);
		});

		test("Count can be bound", () => {
			class MyObject extends ManagedObject {
				constructor() {
					super();
					bound("map.count").bindTo(this, "boundCount");
				}
				boundCount?: number;
			}
			class MyParent extends ManagedObject {
				map = this.attach(new ManagedMap());
				object = this.attach(new MyObject());
			}
			let p = new MyParent();
			expect(p.object).toHaveProperty("boundCount").toBe(0);
			p.map.set("a", new ManagedObject());
			expect(p.object).toHaveProperty("boundCount").toBe(1);
			p.map.get("a")!.unlink();
			expect(p.map).toHaveProperty("count").toBe(0);
			expect(p.object).toHaveProperty("boundCount").toBe(0);
		});

		test("Items can be bound", () => {
			class FooObject extends ManagedObject {
				name = "foo";
			}
			class MyObject extends ManagedObject {
				constructor() {
					super();
					bound("map.#foo.name").bindTo(this, "boundFoo");
				}
				boundFoo?: number;
			}
			class MyParent extends ManagedObject {
				map = new ManagedMap();
				object = this.attach(new MyObject());
			}
			let p = new MyParent();
			expect(p.object).toHaveProperty("boundFoo").toBeUndefined();
			p.map.set("foo", new FooObject());
			expect(p.object).toHaveProperty("boundFoo").toBe("foo");
			p.map.unset("foo");
			expect(p.object).toHaveProperty("boundFoo").toBeUndefined();
		});
	});
});
