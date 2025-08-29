import { beforeAll, describe, expect, test } from "vitest";
import {
	AppContext,
	Binding,
	ObservableList,
	ObservableObject,
	app,
	bind,
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

describe("Basic bindings", () => {
	function setup() {
		class ObjectWithBind extends ObservableObject {
			getBinding(property: keyof this) {
				return this.bind(property);
			}
			applyBind(property: keyof this, source: Binding | string) {
				if (typeof source === "string") {
					source = bind(source);
				}
				let self = this as any;
				this.observe(source, function (v: any) {
					expect(this).toBe(self);
					if (!(property in self)) self[property] = undefined;
					self[property] = v;
				});
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
			get nonObservableObject() {
				return this._object;
			}
			set nonObservableObject(v: ChildObject | undefined) {
				this._object = v;
			}
			private _object?: ChildObject;
		}
		TestObject.enableBindings();
		ChildObject.enableBindings();
		return { TestObject, ChildObject };
	}

	test("Single binding", () => {
		let { TestObject } = setup();
		let c = new TestObject();
		c.child.applyBind("aa", "a");
		expect(c.child).toHaveProperty("aa", 1);
	});

	test("Single binding, same property name", () => {
		let { TestObject } = setup();
		let c = new TestObject();
		c.child.applyBind("a", "a");
		expect(c.child).toHaveProperty("a", 1);
	});

	test("Single binding, update", () => {
		let { TestObject } = setup();
		let c = new TestObject();
		// bind child.aa to a:
		c.child.applyBind("aa", "a");
		c.a = 2;
		expect(c.child).toHaveProperty("aa", 2);
	});

	test("Single binding, update from setter", () => {
		let { TestObject } = setup();
		let c = new TestObject();
		c.child.applyBind("aa", "x");
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
		c.child.applyBind("aa", "a");
		expect(c.child).toHaveProperty("aa", 1);
		c.c = "2";
		c.child.applyBind("bb", "c");
		expect(c.child).toHaveProperty("bb", 2);
	});

	test("Single binding, unlink target", () => {
		let { TestObject } = setup();
		let c = new TestObject();
		let binding = bind("a");
		let update = 0;
		c.child.observe(binding, (a) => {
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
		let binding = bind("a");
		let update = 0;
		c.child.observe(binding, (a) => {
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
		nested.applyBind("aa", "child.a");
		c.child.a = 3;
		expect(c.child.nested).toHaveProperty("aa", 3);
	});

	test("Single binding with 2-step path, change first", () => {
		let { TestObject } = setup();
		let c = new TestObject();
		c.child.applyBind("aa", "other.aa");
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
		c.child.applyBind("aa", "other.aa");
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
		nested.applyBind("aa", "a");
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
		nested2.applyBind("aa", "child.nested.aa");
		nested.aa = 3;
		expect(c.child.nested?.nested).toHaveProperty("aa", 3);
	});

	test("Single binding with 3-step path, change first", () => {
		let { TestObject, ChildObject } = setup();
		let c = new TestObject();
		let otherNested = c.other.attachNested();
		c.child.applyBind("aa", "other.nested.aa");
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
		c.child.applyBind("aa", "other.nested.aa");
		otherNested.aa = 3;
		expect(c.child).toHaveProperty("aa", 3);
		c.other.unlink();
		expect(c.child).toHaveProperty("aa", undefined);
	});

	test("Single binding with 3-step path, unlink midway", () => {
		let { TestObject } = setup();
		let c = new TestObject();
		let otherNested = c.other.attachNested();
		c.child.applyBind("aa", "other.nested.aa");
		let updateCount = 0;
		c.child.observe(bind("other.nested.aa"), (value, bound) => {
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
		c.other.nonObservableObject = new ChildObject();
		let nonObsNested = c.other.nonObservableObject.attachNested();
		nonObsNested.aa = 3;
		c.child.applyBind("aa", "other.nonObservableObject.nested.aa");
		expect(c.child).toHaveProperty("aa", 3);
		nonObsNested.aa = 4;
		expect(c.child).toHaveProperty("aa", 3);
		c.other.emitChange();
		expect(c.child).toHaveProperty("aa", 4);
		c.other.unlink();
		expect(c.child).toHaveProperty("aa", undefined);
	});

	test("Update 2-step non-observable binding using change event", () => {
		class ChangedObject extends ObservableObject {
			get nonObserved() {
				return this._nonObserved;
			}
			set nonObserved(v) {
				this._nonObserved = v;
			}
			private _nonObserved = 1;
		}
		class BoundObject extends ObservableObject {
			a?: number;
			bindnonObserved() {
				this.observe(bind("changeable.nonObserved"), (v: any) => {
					this.a = v;
				});
			}
		}
		class Parent extends ObservableObject {
			constructor() {
				super();
				this.changeable = new ChangedObject();
			}
			declare changeable: ChangedObject;
			readonly bound = this.attach(new BoundObject());
		}
		Parent.enableBindings();
		let p = new Parent();
		p.bound.bindnonObserved();
		expect(p.bound).toHaveProperty("a", 1);
		p.changeable.nonObserved = 2;
		expect(p.bound).toHaveProperty("a", 1);
		p.changeable.emitChange("Update");
		expect(p.bound).toHaveProperty("a", 2);
	});

	test("Bind to property of observed list item: indexed, first, last", () => {
		class ListItem extends ObservableObject {
			constructor(n: number) {
				super();
				this.n = n;
			}
			n: number;
		}
		class BoundObject extends ObservableObject {
			a?: number;
			bindNumber(b: string) {
				this.observe(bind(b), (v: any) => {
					this.a = v;
				});
				return this;
			}
		}
		class Parent extends ObservableObject {
			list = new ObservableList().restrict(ListItem);
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
		Parent.enableBindings();
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

	test("Binding to observable object, emit change event", () => {
		let { TestObject, ChildObject } = setup();
		let c = new TestObject();
		let changes: any[] = [];
		let other = c.other;
		c.child.observe(bind("other"), (v: any) => {
			changes.push(v);
		});
		expect(changes).toEqual([other]);
		other.emitChange();
		expect(changes).toEqual([other, other]);
		let newOther = new ChildObject();
		c.other = newOther;
		expect(changes).toEqual([other, other, newOther]);
		newOther.emitChange();
		expect(changes).toEqual([other, other, newOther, newOther]);
		other.emitChange();
		expect(changes).toEqual([other, other, newOther, newOther]);
		newOther.unlink();
		expect(changes).toEqual([other, other, newOther, newOther]);
		c.other = other;
		expect(changes).toEqual([other, other, newOther, newOther, other]);
		other.emitChange();
		expect(changes).toEqual([other, other, newOther, newOther, other, other]);
	});

	test("Binding to plain object property", () => {
		let { TestObject } = setup();
		let c = new TestObject();
		c.child.applyBind("aa", "obj.foo");
		expect(c.child).toHaveProperty("aa", "bar");
		c.obj = { foo: "baz" };
		expect(c.child).toHaveProperty("aa", "baz");
		c.obj = undefined;
		expect(c.child).toHaveProperty("aa", undefined);
	});

	test("Binding to specific origin (object.bind())", () => {
		let { TestObject } = setup();
		let a = new TestObject();
		a.a = 123;
		let c = new TestObject();
		c.applyBind("a", a.getBinding("a"));
		expect(c).toHaveProperty("a", 123);
		a.a = 234;
		expect(c).toHaveProperty("a", 234);
	});

	test("Binding non-observable property directly", () => {
		class Child extends ObservableObject {
			constructor() {
				super();
				this.observe(bind("nonObserved"), (v: any) => {
					this.nonObserved = v;
				});
			}
			nonObserved?: number;
		}
		class Parent extends ObservableObject {
			foo = 1;
			get nonObserved() {
				return this.foo;
			}
			child = this.attach(new Child());
		}
		Parent.enableBindings();
		let p = new Parent();
		expect(p.child).toHaveProperty("nonObserved", 1);
		p.foo = 2;
		expect(p.child).toHaveProperty("nonObserved", 1); // old value
		p.emitChange();
		expect(p.child).toHaveProperty("nonObserved", 2); // new value
	});

	test("Binding to parent property because of limited enabled binding", () => {
		class Child extends ObservableObject {
			constructor() {
				super();
				// this should bind to parent two, not one:
				this.observe(bind("parentId"), (v: any) => {
					this.parentId = v;
				});
			}
			parentId?: string;
		}
		class ParentOne extends ObservableObject {
			// bindings not enabled here
			parentId = "one";
			child = this.attach(new Child());
		}
		class ParentTwo extends ObservableObject {
			parentId = "two";
			child = this.attach(new ParentOne());
		}
		ParentTwo.enableBindings();
		let p = new ParentTwo();
		expect(p.child.child).toHaveProperty("parentId", "two");
	});

	test("Volume test", () => {
		let { TestObject } = setup();
		let c = new TestObject();
		let child = c.child;
		child.applyBind("aa", "b");
		for (let i = 0; i < 100; i++) {
			child = child.attachNested();
			child.applyBind("aa", "b");
			child.applyBind("bb", "child.a");
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

	test("Binding on unlinked should throw", () => {
		let { TestObject } = setup();
		let c = new TestObject();
		let child = c.child;
		child.unlink();
		expect(() => child.applyBind("aa", "a")).toThrow(/unlinked/);
	});
});

describe("Observed list / array bindings", () => {
	function setup() {
		class Parent extends ObservableObject {
			child = this.attach(new Child());
			value?: any;
		}
		Parent.enableBindings();
		class Child extends ObservableObject {
			list = new ObservableList();
			bindList(b: string) {
				this.observe(bind(b), (v: any) => {
					this.list = v;
				});
			}
		}
		return { Parent };
	}

	test("Can bind ObservableList to other instance", () => {
		let { Parent } = setup();
		let parent = new Parent();
		let newList = new ObservableList();
		parent.value = newList;
		parent.child.bindList("value");
		expect(parent.child).toHaveProperty("list", newList);
	});

	test("Can bind ObservableList to other instance, then remove", () => {
		let { Parent } = setup();
		let parent = new Parent();
		let newList = new ObservableList();
		parent.value = newList;
		parent.child.bindList("value");
		expect(parent.child).toHaveProperty("list", newList);
		parent.value = undefined;
		expect(parent.child.list).toBeUndefined();
	});

	test("Shouldn't bind to `length` within list", () => {
		class Child extends ObservableObject {
			constructor() {
				super();
				this.observe(bind("length"), (v: any) => {
					this.length = v;
				});
			}
			length = 1;
		}
		class Parent extends ObservableObject {
			length = 123;
			list = this.attach(new ObservableList(new Child())).attachItems(true);
		}
		Parent.enableBindings();
		let p = new Parent();
		expect(p.list.first()).toHaveProperty("length", 123);
	});
});

describe("Mapped/boolean bindings", () => {
	function setup() {
		class Parent extends ObservableObject {
			readonly child = this.attach(new Child());
			value1 = 1;
			value2 = 2;
			value3 = 3;
			str?: string;
			list?: any;
		}
		Parent.enableBindings();

		class Child extends ObservableObject {
			bindValue(b: Binding) {
				this.observe(b, (v: any) => {
					this.value = v;
				});
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

	test("Mapped: not, using map()", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("value1").map((v) => !v));
		parent.child.expectValue().toBe(false);
		parent.value1 = 0;
		parent.child.expectValue().toBe(true);
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

	test("Convert: then", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("value1").then(1, 2));
		parent.child.expectValue().toBe(1);
		parent.value1 = 0;
		parent.child.expectValue().toBe(2);
		parent.value1 = undefined as any;
		parent.child.expectValue().toBe(2);
	});

	test("Convert: else", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("value1").else(2));
		parent.child.expectValue().toBe(1);
		parent.value1 = 0;
		parent.child.expectValue().toBe(2);
		parent.value1 = undefined as any;
		parent.child.expectValue().toBe(2);
		parent.value1 = 1;
		parent.child.expectValue().toBe(1);
	});

	test("Convert: then, else", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("value1").then(1).else(2));
		parent.child.expectValue().toBe(1);
		parent.value1 = 0;
		parent.child.expectValue().toBe(2);
		parent.value1 = undefined as any;
		parent.child.expectValue().toBe(2);
		parent.value1 = 1;
		parent.child.expectValue().toBe(1);
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
		parent.child.bindValue(bind("value1").asString("{:.2f}"));
		parent.child.expectValue().toBe("1.00");
		parent.value1 = 0;
		parent.child.expectValue().toBe("0.00");
		parent.value1 = undefined as any;
		parent.child.expectValue().toBe("0.00");
	});

	test("Convert and format: asString(format) with string", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("str").asString("{:?/a/b}"));
		parent.child.expectValue().toBe("b");
		parent.str = "X";
		parent.child.expectValue().toBe("a");
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

	test("Convert: equals", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("value1").equals(1));
		parent.child.expectValue().toBe(true);
		parent.value1 = 0;
		parent.child.expectValue().toBe(false);
	});

	test("Convert: lt", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("value1").lt(2));
		parent.child.expectValue().toBe(true);
		parent.value1 = 3;
		parent.child.expectValue().toBe(false);
	});

	test("Convert: gt", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("value1").gt(0));
		parent.child.expectValue().toBe(true);
		parent.value1 = -1;
		parent.child.expectValue().toBe(false);
	});

	test("Matches", () => {
		let { parent } = setup();
		parent.child.bindValue(bind("value1").matches("value2"));
		parent.child.expectValue().toBe(false);
		parent.value2 = parent.value1;
		parent.child.expectValue().toBe(true);
		parent.value2++;
		parent.child.expectValue().toBe(false);
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

	test("Neither-binding, 3 terms", () => {
		let { parent } = setup();
		parent.child.bindValue(bind.neither("value1", "value2", bind("value3")));
		parent.value1 = 0;
		parent.value2 = 0;
		parent.value3 = 0;
		expect(JSON.stringify(parent.child.updates)).toBe(
			"[false,false,false,true]",
		);
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
		class Parent extends ObservableObject {
			readonly child = this.attach(new Child());
			value1 = 1;
			str = "ABC";
		}
		Parent.enableBindings();

		class Child extends ObservableObject {
			value?: any;
			bindValue(b: Binding) {
				this.observe(b, (v: any) => {
					this.value = v;
				});
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
		let binding = bind.fmt("Abc");
		expect(String(binding)).toBe('bind.fmt("Abc")');
		parent.child.bindValue(binding);
		parent.child.expectStringValue().toBe("Abc");
	});

	test("Basic string binding", () => {
		let { parent } = setup();
		parent.child.bindValue(bind.fmt("Abc {}", bind("str")));
		parent.child.expectStringValue().toBe("Abc ABC");
	});

	test("Basic string binding with Binding instance", () => {
		let { parent } = setup();
		parent.child.bindValue(bind.fmt("Abc {}", bind("str")));
		parent.child.expectStringValue().toBe("Abc ABC");
	});

	test("Multiple value string binding", () => {
		let { parent } = setup();
		parent.child.bindValue(
			bind
				.fmt(
					"Value: {:.2f} {}: {:i}",
					bind("value1"),
					bind("str"),
					bind("value1"),
				)
				.asString(),
		);
		parent.child.expectValue().toBe("Value: 1.00 ABC: 1");
	});

	test("Named string binding using {...}", () => {
		let { parent } = setup();
		parent.child.bindValue(bind.fmt("Abc {foo}", { foo: bind("str") }));
		parent.child.expectStringValue().toBe("Abc ABC");
	});

	test("Named string binding using {...}, nonexistent property", () => {
		let { parent } = setup();
		parent.child.bindValue(bind.fmt("Abc {bar}", { foo: bind("str") }));
		parent.child.expectStringValue().toBe("Abc ");
	});

	test("Multiple value named string binding using {...}", () => {
		let { parent } = setup();
		parent.child.bindValue(
			bind.fmt("Value: {value:.2f} {str}: {value:n} {value:+/a/b}", {
				value: bind("value1"),
				str: bind("str"),
			}),
		);
		parent.child.expectStringValue().toBe("Value: 1.00 ABC: 1 a");
	});
});
