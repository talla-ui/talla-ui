import { beforeAll, describe, expect, test } from "vitest";
import {
	AppContext,
	Binding,
	ManagedList,
	ManagedObject,
	bind,
	binding,
} from "../../dist/index.js";

beforeAll(() => {
	AppContext.setErrorHandler((e) => {
		throw e;
	});
});

test("Constructor without params", () => {
	expect(() => new Binding()).not.toThrowError();
	expect(new Binding()).toHaveProperty("isBinding");
	expect(String(new Binding())).toBe("bind()");
});

test("Constructor with empty string", () => {
	expect(() => new Binding("")).not.toThrowError();
	expect(new Binding("")).toHaveProperty("isBinding");
});

test("Global functions with empty string", () => {
	expect(() => bind("")).not.toThrowError();
	expect(bind("")).toHaveProperty("isBinding");
	expect(() => bind.not("")).not.toThrowError();
	expect(bind.not("")).toHaveProperty("isBinding");
});

test("Constructor with invalid argument", () => {
	expect(() => new Binding({} as any)).toThrowError();
});

test("Constructor with path", () => {
	let b = new Binding("x.y");
	expect(b.isBinding()).toBe(true);
	expect(String(b)).toMatch(/x\.y/);
});

test("Constructor with path and filters", () => {
	// DEPRECATED
	let b = new Binding("!x.y|!|!");
	expect(b.isBinding()).toBe(true);
});

describe("Basic bindings", () => {
	function setup() {
		class ObjectWithBind extends ManagedObject {
			bind(property: keyof this, source: Binding | string) {
				if (typeof source === "string") {
					source = bind(source);
				}
				source.bindTo(this, property);
			}
		}
		class TestObject extends ObjectWithBind {
			constructor() {
				super();

				// add dynamic property x
				let x = 0;
				Object.defineProperty(this, "x", {
					configurable: true,
					get() {
						return x;
					},
					set(v) {
						x = v;
					},
				});
			}

			/** Property using getter/setter */
			declare x: number;

			/** Regular properties */
			a? = 1;
			b? = 123;
			obj? = { foo: "bar" };

			/** Attached objects */
			readonly child = this.attach(new ChildObject());
			other = this.attach(new ChildObject());

			changeOther(child = new ChildObject()) {
				return (this.other = this.attach(child));
			}
		}
		class ChildObject extends ObjectWithBind {
			a?: number;
			aa?: number;
			bb?: number;
			nested?: ChildObject;

			attachNested() {
				return (this.nested = this.attach(new ChildObject()));
			}

			/** Object property with getter/setter to avoid being watched */
			get nonObservedObject() {
				return this._object;
			}
			set nonObservedObject(v: ChildObject | undefined) {
				this._object = v;
			}
			private _object?: ChildObject;
		}
		return { TestObject, ChildObject };
	}

	test("Single binding", () => {
		let { TestObject } = setup();
		let c = new TestObject();
		c.child.bind("aa", "a");
		expect(c.child).toHaveProperty("aa", 1);
	});

	test("Single binding, same property name", () => {
		let { TestObject } = setup();
		let c = new TestObject();
		c.child.bind("a", "a");
		expect(c.child).toHaveProperty("a", 1);
	});

	test("Single binding, update", () => {
		let { TestObject } = setup();
		let c = new TestObject();
		// bind child.aa to a:
		c.child.bind("aa", "a");
		c.a = 2;
		expect(c.child).toHaveProperty("aa", 2);
	});

	test("Single binding, update from setter", () => {
		let { TestObject } = setup();
		let c = new TestObject();
		c.child.bind("aa", "x");
		c.x = 2;
		expect(c.child).toHaveProperty("aa", 2);
	});

	test("Binding on subclass", () => {
		let { TestObject } = setup();
		class SubObject extends TestObject {
			constructor() {
				super();
				let c: number;
				Object.defineProperty(this, "c", {
					configurable: true,
					get() {
						return c;
					},
					set(v) {
						c = +v;
					},
				});
			}
			declare c: number | string;
		}
		let c = new SubObject();
		c.child.bind("aa", "a");
		expect(c.child).toHaveProperty("aa", 1);
		c.c = "2";
		c.child.bind("bb", "c");
		expect(c.child).toHaveProperty("bb", 2);
	});

	test("Single binding, unlink target", () => {
		let { TestObject } = setup();
		let c = new TestObject();
		let binding = bind("a").asNumber();
		let update = 0;
		binding.bindTo(c.child, (a) => {
			console.log("Binding updated", a);
			update++;
		});
		c.a = 1;
		c.a = 2;
		expect(update).toBe(2);
		c.child.unlink();
		c.a = 3;
		c.a = 4;
		expect(update).toBe(2);
	});

	test("Single binding, unlink origin", () => {
		let { TestObject } = setup();
		let c = new TestObject();
		let binding = bind("a").asNumber();
		let update = 0;
		binding.bindTo(c.child, (a) => {
			console.log("Binding updated", a);
			update++;
		});
		c.a = 1;
		c.a = 2;
		expect(update).toBe(2);
		c.unlink(); // this calls binding one more time, with NaN
		expect(update).toBe(3);
		c.a = 3;
		c.a = 4;
		expect(update).toBe(3);
	});

	test("Single binding with 2-step path", () => {
		let { TestObject } = setup();
		let c = new TestObject();
		let nested = c.child.attachNested();
		nested.bind("aa", "child.a");
		c.child.a = 3;
		expect(c.child.nested).toHaveProperty("aa", 3);
	});

	test("Single binding with 2-step path, change first", () => {
		let { TestObject } = setup();
		let c = new TestObject();
		c.child.bind("aa", "other.aa");
		c.other.aa = 3;
		expect(c.child).toHaveProperty("aa", 3);
		c.changeOther();
		expect(c.child).toHaveProperty("aa", undefined);
		c.other.aa = 4;
		expect(c.child).toHaveProperty("aa", 4);
	});

	test("Single binding with 2-step path, delete first", () => {
		let { TestObject } = setup();
		let c = new TestObject();
		c.child.bind("aa", "other.aa");
		c.other.aa = 3;
		expect(c.child).toHaveProperty("aa", 3);
		(c as any).other = undefined;
		expect(c.child).toHaveProperty("aa", undefined);
	});

	test("Single binding, move target", () => {
		let { TestObject } = setup();
		let c = new TestObject();
		let nested = c.other.attachNested();
		// make other.nested.aa binding refer to other.a:
		nested.bind("aa", "a");
		c.other.a = 3;
		expect(c.other.nested).toHaveProperty("aa", 3);
		c.changeOther(nested);
		// aa binding now refers to parent.a:
		expect(c.other).toHaveProperty("aa", 1);
	});

	test("Single binding with 3-step path", () => {
		let { TestObject } = setup();
		let c = new TestObject();
		let nested = c.child.attachNested();
		let nested2 = nested.attachNested();
		nested2.bind("aa", "child.nested.aa");
		nested.aa = 3;
		expect(c.child.nested?.nested).toHaveProperty("aa", 3);
	});

	test("Single binding with 3-step path, change first", () => {
		let { TestObject, ChildObject } = setup();
		let c = new TestObject();
		let otherNested = c.other.attachNested();
		c.child.bind("aa", "other.nested.aa");
		otherNested.aa = 3;
		expect(c.child).toHaveProperty("aa", 3);
		let newOther = new ChildObject();
		let newOtherNested = newOther.attachNested();
		newOtherNested.aa = 4;
		c.changeOther(newOther);
		expect(c.child).toHaveProperty("aa", 4);
	});

	test("Single binding with 3-step path, unlink first", () => {
		let { TestObject } = setup();
		let c = new TestObject();
		let otherNested = c.other.attachNested();
		c.child.bind("aa", "other.nested.aa");
		otherNested.aa = 3;
		expect(c.child).toHaveProperty("aa", 3);
		c.other.unlink();
		expect(c.child).toHaveProperty("aa", undefined);
	});

	test("Single binding with 3-step path, unlink midway", () => {
		let { TestObject } = setup();
		let c = new TestObject();
		let otherNested = c.other.attachNested();
		c.child.bind("aa", "other.nested.aa");
		let updateCount = 0;
		bind("other.nested.aa").bindTo(c.child, (value, bound) => {
			console.log("3-step path updated", value, bound);
			updateCount++;
		});
		otherNested.aa = 3;
		expect(c.child).toHaveProperty("aa", 3);
		expect(updateCount).toBe(2);
		otherNested.unlink();
		expect(c.child).toHaveProperty("aa", undefined);
		let newOtherNested = c.other.attachNested();
		newOtherNested.aa = 4;
		expect(c.child).toHaveProperty("aa", 4);
		expect(updateCount).toBe(4); // undefined, 3, undefined, 4
	});

	test("Single binding with 4-step path through non-observable object ref", () => {
		let { TestObject, ChildObject } = setup();
		let c = new TestObject();
		c.other.nonObservedObject = new ChildObject();
		let nonObsNested = c.other.nonObservedObject.attachNested();
		nonObsNested.aa = 3;
		c.child.bind("aa", "other.nonObservedObject.nested.aa");
		expect(c.child).toHaveProperty("aa", 3);
		nonObsNested.aa = 4;
		expect(c.child).toHaveProperty("aa", 3);
		c.other.emitChange();
		expect(c.child).toHaveProperty("aa", 4);
		c.other.unlink();
		expect(c.child).toHaveProperty("aa", undefined);
	});

	test("Update 2-step non-observed binding using change event", () => {
		class ChangedObject extends ManagedObject {
			get nonObserved() {
				return this._nonObserved;
			}
			set nonObserved(v) {
				this._nonObserved = v;
			}
			private _nonObserved = 1;
		}
		class BoundObject extends ManagedObject {
			a?: number;
			bindnonObserved() {
				bind("changeable.nonObserved").bindTo(this, "a");
			}
		}
		class Parent extends ManagedObject {
			constructor() {
				super();
				this.changeable = new ChangedObject();
			}
			declare changeable: ChangedObject;
			readonly bound = this.attach(new BoundObject());
		}
		let p = new Parent();
		p.bound.bindnonObserved();
		expect(p.bound).toHaveProperty("a", 1);
		p.changeable.nonObserved = 2;
		expect(p.bound).toHaveProperty("a", 1);
		p.changeable.emitChange("Update");
		expect(p.bound).toHaveProperty("a", 2);
	});

	test("Bind to property of managed list item: indexed, first, last", () => {
		class ListItem extends ManagedObject {
			constructor(n: number) {
				super();
				this.n = n;
			}
			n: number;
		}
		class BoundObject extends ManagedObject {
			a?: number;
			bindNumber(b: string) {
				bind(b).bindTo(this, "a");
				return this;
			}
		}
		class Parent extends ManagedObject {
			list = new ManagedList().restrict(ListItem);
			readonly boundIndex = this.attach(
				new BoundObject().bindNumber("list.0.n"),
			);
			readonly boundFirst = this.attach(
				new BoundObject().bindNumber("list.#first.n"),
			);
			readonly boundLast = this.attach(
				new BoundObject().bindNumber("list.#last.n"),
			);
		}
		let p = new Parent();

		console.log("Testing list with zero items");
		expect(p.boundIndex.a).toBeUndefined();
		expect(p.boundFirst.a).toBeUndefined();
		expect(p.boundLast.a).toBeUndefined();

		console.log("Testing list with 1 item");
		p.list.add(new ListItem(1));
		expect(p.boundIndex.a).toBe(1);
		expect(p.boundFirst.a).toBe(1);
		expect(p.boundLast.a).toBe(1);

		console.log("Testing list with 2 items");
		p.list.insert(new ListItem(2), p.list.first());
		expect(p.boundIndex.a).toBe(2);
		expect(p.boundFirst.a).toBe(2);
		expect(p.boundLast.a).toBe(1);
	});

	test("Binding to plain object property", () => {
		let { TestObject } = setup();
		let c = new TestObject();
		c.child.bind("aa", "obj.foo");
		expect(c.child).toHaveProperty("aa", "bar");
		c.obj = { foo: "baz" };
		expect(c.child).toHaveProperty("aa", "baz");
		c.obj = undefined;
		expect(c.child).toHaveProperty("aa", undefined);
	});

	test("Binding non-observable property: error", () => {
		expect(() => {
			class Child extends ManagedObject {
				constructor() {
					super();
					bind("nonObserved").bindTo(this, "nonObserved");
					// issue is async error, not caught by jest
				}
				nonObserved?: number;
			}
			class Parent extends ManagedObject {
				get nonObserved() {
					return 1;
				}
				child = this.attach(new Child());
			}
			new Parent();
		}).toThrow(/observable/);
	});

	test("Debug handler", () => {
		let { TestObject } = setup();
		try {
			Binding.debugHandler = (b) => {
				if (b.binding.toString() !== "bind(a)")
					throw new Error("Binding mismatch");
				if (b.value !== 1) throw new Error("Value mismatch");
			};
			let c = new TestObject();
			c.child.bind("aa", bind("a").debug());
			expect(Binding.debugHandler).toBeDefined();
			Binding.debugHandler = undefined;
			c.a = 2;
			expect(Binding.debugHandler).toBeUndefined();
		} finally {
			Binding.debugHandler = undefined;
		}
	});

	test("Volume test", () => {
		let { TestObject } = setup();
		let c = new TestObject();
		let child = c.child;
		child.bind("aa", "b");
		for (let i = 0; i < 100; i++) {
			child = child.attachNested();
			child.bind("aa", "b");
			child.bind("bb", "child.a");
		}
		c.b = 2;
		c.child.a = 3;
		let check: any = c.child;
		while (check) {
			expect(check).toHaveProperty("aa", 2);
			check = check.nested;
			if (check) expect(check).toHaveProperty("bb", 3);
		}
	});

	test("Single binding on unlinked shouldn't fail, but also not work", () => {
		let { TestObject } = setup();
		let c = new TestObject();
		let child = c.child;
		child.unlink();
		child.bind("aa", "a");
		c.a = 123;
		expect(child.aa).toBeUndefined();
	});
});

describe("Bindings with source labels", () => {
	function setup(property: string | symbol) {
		let c = Object.assign(new ManagedObject(), { a: 0 });
		let p1 = Object.assign(new ManagedObject(), { a: 1 });
		let p2 = Object.assign(new ManagedObject(), {
			a: 2 as any,
			[property]: true,
		});
		(p1 as any).attach(c);
		(p2 as any).attach(p1);
		return [c, p1, p2] as const;
	}
	const sym = Symbol("FOO");

	test("Unbound binding", () => {
		let [c] = setup("FOO");
		new Binding({ path: ["a"], label: "BAR" }).bindTo(c, "a");
		expect(c.a).toBeUndefined();
	});

	test("String label", () => {
		let [c, _, p2] = setup("FOO");
		new Binding({ path: ["a"], label: "FOO" }).bindTo(c, "a");
		expect(c.a).toBe(2);
		p2.a = 3;
		expect(c.a).toBe(3);
	});

	test("Symbol label, using $on", () => {
		let [c] = setup(sym);
		const $test = bind.$on(sym);
		$test.bind("a").bindTo(c, "a");
		expect(c.a).toBe(2);
	});

	test("$on, .string", () => {
		let [c] = setup(sym);
		const $test = bind.$on(sym);
		$test.string("a").bindTo(c, "a");
		expect(c.a).toBe("2");
	});

	test("$on, .number", () => {
		let [c, _, p2] = setup(sym);
		const $test = bind.$on(sym);
		$test.number("a").bindTo(c, "a");
		expect(c.a).toBe(2);
		p2.a = "3";
		expect(c.a).toBe(3);
	});

	test("$on, .boolean", () => {
		let [c, _, p2] = setup(sym);
		const $test = bind.$on(sym);
		$test.boolean("a").bindTo(c, "a");
		expect(c.a).toBe(true);
		p2.a = 0;
		expect(c.a).toBe(false);
	});

	test("$on, .not", () => {
		let [c, _, p2] = setup(sym);
		const $test = bind.$on(sym);
		$test.not("a").bindTo(c, "a");
		expect(c.a).toBe(false);
		p2.a = 0;
		expect(c.a).toBe(true);
	});

	test("$on, .list", () => {
		let [c, _, p2] = setup(sym);
		const $test = bind.$on(sym);
		$test.list("a").bindTo(c, "a");
		expect(c.a).toBeUndefined();
		p2.a = [1, 2, 3];
		expect(c.a).toEqual([1, 2, 3]);
	});
});

describe("Binding decorator", () => {
	test("Decorator using string argument", () => {
		class ParentObject extends ManagedObject {
			a = 123;
			child = this.attach(new ChildObject());
		}
		class ChildObject extends ManagedObject {
			@binding("a")
			a?: number;
		}
		let p = new ParentObject();
		expect(p.child.a).toBe(123);
	});

	test("Decorator using binding argument", () => {
		class ParentObject extends ManagedObject {
			a = 123;
			child = this.attach(new ChildObject());
		}
		class ChildObject extends ManagedObject {
			@binding(bind("a"))
			a?: number;
		}
		let p = new ParentObject();
		expect(p.child.a).toBe(123);
	});
});

describe("Managed list / array bindings", () => {
	function setup() {
		class Parent extends ManagedObject {
			child = this.attach(new Child());
			value?: any;
		}
		class Child extends ManagedObject {
			list = new ManagedList();
			bindList(b: string) {
				bind(b).bindTo(this, "list");
			}
		}
		return { Parent };
	}

	test("Can bind ManagedList to other instance", () => {
		let { Parent } = setup();
		let parent = new Parent();
		let newList = new ManagedList();
		parent.value = newList;
		parent.child.bindList("value");
		expect(parent.child).toHaveProperty("list", newList);
	});

	test("Can bind ManagedList to other instance, then remove", () => {
		let { Parent } = setup();
		let parent = new Parent();
		let newList = new ManagedList();
		parent.value = newList;
		parent.child.bindList("value");
		expect(parent.child).toHaveProperty("list", newList);
		parent.value = undefined;
		expect(parent.child.list).toBeUndefined();
	});

	test("Shouldn't bind to `count` within list", () => {
		class Child extends ManagedObject {
			constructor() {
				super();
				bind("count").bindTo(this, "count");
			}
			count?: number;
		}
		class Parent extends ManagedObject {
			count = 123;
			list = this.attach(new ManagedList(new Child()));
		}
		let p = new Parent();
		expect(p.list.first()).toHaveProperty("count", 123);
	});
});

describe("Filtered/boolean bindings", () => {
	function setup() {
		class Parent extends ManagedObject {
			readonly child = this.attach(new Child());
			value1 = 1;
			value2 = 2;
			value3 = 3;
			str?: string;
			list?: any;
		}

		class Child extends ManagedObject {
			bindValue(b: Binding) {
				b.bindTo(this, "value");
			}
			expectValue() {
				expect(this).toHaveProperty("value");
				return expect(this.value);
			}
			set value(v: any) {
				this.updates.push(v);
				this._value = v;
			}
			get value() {
				return this._value;
			}
			private _value?: any;
			updates: any[] = [];
		}

		return { parent: new Parent() };
	}

	test("Default value", () => {
		let { parent } = setup();
		const defaultValue = {};
		parent.child.bindValue(bind("noStateProperty", defaultValue));
		parent.child.expectValue().toBe(defaultValue);
	});

	test("Convert: not", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("value1").not());
		parent.child.expectValue().toBe(false);
		parent.value1 = 0;
		parent.child.expectValue().toBe(true);
	});

	test("Convert: bind.not", () => {
		let { parent } = setup();
		parent.child.bindValue(bind.not("value1"));
		parent.child.expectValue().toBe(false);
		parent.value1 = 0;
		parent.child.expectValue().toBe(true);
	});

	test("Convert: asBoolean", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("value1").asBoolean());
		parent.child.expectValue().toBe(true);
		parent.value1 = 0;
		parent.child.expectValue().toBe(false);
	});

	test("Convert: asBoolean", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("value1").asBoolean());
		parent.child.expectValue().toBe(true);
		parent.value1 = 0;
		parent.child.expectValue().toBe(false);
	});

	test("Convert: asString", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("value1").asString());
		parent.child.expectValue().toBe("1");
		parent.value1 = 0;
		parent.child.expectValue().toBe("0");
		parent.value1 = undefined as any;
		parent.child.expectValue().toBe("");
	});

	test("Convert and format: asString(format) with number", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("value1").asString(".2f"));
		parent.child.expectValue().toBe("1.00");
		parent.value1 = 0;
		parent.child.expectValue().toBe("0.00");
		parent.value1 = undefined as any;
		parent.child.expectValue().toBe("NaN");
	});

	test("Convert and format: asString(format) with string", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("str").asString("lc"));
		parent.child.expectValue().toBe("");
		parent.str = "ABC";
		parent.child.expectValue().toBe("abc");
	});

	test("Convert: asString", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("value1").asString());
		parent.child.expectValue().toBe("1");
		parent.value1 = 0;
		parent.child.expectValue().toBe("0");
		parent.value1 = undefined as any;
		parent.child.expectValue().toBe("");
	});

	test("Convert: asNumber", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("str").asNumber());
		parent.child.expectValue().toBeNaN();
		parent.str = "1.5";
		parent.child.expectValue().toBe(1.5);
	});

	test("Convert: asList", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("list").asList());
		parent.child.expectValue().toBeUndefined();
		parent.list = ["a", "b"];
		parent.child.expectValue().toEqual(["a", "b"]);
		parent.list = 123;
		parent.child.expectValue().toBeUndefined();
	});

	test("Matches: single parameter", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("value1").matches(1));
		parent.child.expectValue().toBe(true);
		parent.value1 = 0;
		parent.child.expectValue().toBe(false);
	});

	test("Matches: multiple parameters", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("value1").matches(3, 2, 1));
		parent.child.expectValue().toBe(true);
		parent.value1 = 0;
		parent.child.expectValue().toBe(false);
	});

	test("Equals", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("value1").equals("value2"));
		parent.child.expectValue().toBe(false);
		parent.value2 = parent.value1;
		parent.child.expectValue().toBe(true);
		parent.value2++;
		parent.child.expectValue().toBe(false);
	});

	test("Select value", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("value1").select(123));
		parent.child.expectValue().toBe(123);
		parent.value1 = 0;
		parent.child.expectValue().toBeUndefined();
	});

	test("Else value", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("value1").else(123));
		parent.child.expectValue().toBe(1);
		parent.value1 = 0;
		parent.child.expectValue().toBe(123);
	});

	test("Select-else single call", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("value1").select(123, 321));
		parent.child.expectValue().toBe(123);
		parent.value1 = 0;
		parent.child.expectValue().toBe(321);
	});

	test("Select-else combination", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("value1").select(123).else(321));
		parent.child.expectValue().toBe(123);
		parent.value1 = 0;
		parent.child.expectValue().toBe(321);
	});

	test("And-binding", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("value1").and(bind("value2")));
		parent.child.expectValue().toBe(2);
		parent.value2 = 0;
		parent.child.expectValue().toBe(0);
		parent.value1 = 0;
		parent.child.expectValue().toBe(0);
		parent.value2 = 2;
		parent.child.expectValue().toBe(0);

		// make sure bound value doesn't get updated until both values known
		expect(JSON.stringify(parent.child.updates)).toBe("[2,0]");
	});

	test("Or-binding", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("value1").or(bind("value2")));
		parent.child.expectValue().toBe(1);
		parent.value2 = 0;
		parent.child.expectValue().toBe(1);
		parent.value1 = 0;
		parent.child.expectValue().toBe(0);
		parent.value2 = 2;
		parent.child.expectValue().toBe(2);

		// make sure bound value doesn't get updated until both values known
		expect(JSON.stringify(parent.child.updates)).toBe("[1,0,2]");
	});

	test("And-binding, 3 terms", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("value1").and("value2").and("value3"));
		parent.child.expectValue().toBe(3);
		parent.value2 = 0;
		parent.child.expectValue().toBe(0);
		parent.value2 = 2;
		parent.child.expectValue().toBe(3);
		parent.value3 = 0;
		parent.child.expectValue().toBe(0);
	});

	test("Or-binding, 3 terms", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("value1").or("value2").or("value3"));
		parent.value1 = 0;
		parent.value2 = 0;
		parent.value3 = 0;
		expect(JSON.stringify(parent.child.updates)).toBe("[1,2,3,0]");
	});

	test("Either-binding, 3 terms", () => {
		let { parent } = setup();
		parent.child.bindValue(bind.either("value1", "value2", bind("value3")));
		parent.value1 = 0;
		parent.value2 = 0;
		parent.value3 = 0;
		expect(JSON.stringify(parent.child.updates)).toBe("[1,2,3,0]");
	});

	test("And-Or-binding", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("value1").and("value2").or("value3"));
		parent.value1 = 0;
		parent.value2 = 0;
		parent.value3 = 0;
		expect(JSON.stringify(parent.child.updates)).toBe("[2,3,0]");
	});
});

describe("String format bindings", () => {
	function setup() {
		class Parent extends ManagedObject {
			readonly child = this.attach(new Child());
			value1 = 1;
			str = "ABC";
		}

		class Child extends ManagedObject {
			value?: any;
			bindValue(b: Binding) {
				b.bindTo(this, "value");
			}
			expectValue() {
				expect(this).toHaveProperty("value");
				return expect(this.value);
			}
			expectStringValue() {
				expect(this).toHaveProperty("value");
				return expect(String(this.value));
			}
		}

		return { parent: new Parent() };
	}

	test("String binding without arguments", () => {
		let { parent } = setup();
		let binding = bind.strf("Abc");
		expect(String(binding)).toBe('bind.strf("Abc")');
		parent.child.bindValue(binding);
		parent.child.expectStringValue().toBe("Abc");
	});

	test("Basic string binding", () => {
		let { parent } = setup();
		parent.child.bindValue(bind.strf("Abc %s", bind("str")));
		parent.child.expectStringValue().toBe("Abc ABC");
	});

	test("Basic string binding with Binding instance", () => {
		let { parent } = setup();
		parent.child.bindValue(bind.strf("Abc %s", bind("str")));
		parent.child.expectStringValue().toBe("Abc ABC");
	});

	test("Multiple value string binding", () => {
		let { parent } = setup();
		parent.child.bindValue(
			bind
				.strf("Value: %.2f %s: %i", bind("value1"), bind("str"), bind("value1"))
				.asString(),
		);
		parent.child.expectValue().toBe("Value: 1.00 ABC: 1");
	});

	test("Named string binding using %[...]", () => {
		let { parent } = setup();
		parent.child.bindValue(bind.strf("Abc %[foo]", { foo: bind("str") }));
		parent.child.expectStringValue().toBe("Abc ABC");
	});

	test("Named string binding using %[...], nonexistent property", () => {
		let { parent } = setup();
		parent.child.bindValue(bind.strf("Abc %[bar]", { foo: bind("str") }));
		parent.child.expectStringValue().toBe("Abc ");
	});

	test("Multiple value named string binding using %[...]", () => {
		let { parent } = setup();
		parent.child.bindValue(
			bind.strf("Value: %[value:.2f] %[str]: %[value:n] %[value:plural|a|b]", {
				value: bind("value1"),
				str: bind("str"),
			}),
		);
		parent.child.expectStringValue().toBe("Value: 1.00 ABC: 1 a");
	});
});
