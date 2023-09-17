import {
	bound,
	Binding,
	ManagedList,
	ManagedObject,
	Observer,
	GlobalEmitter,
} from "../../../dist/index.js";
import { describe, expect, test } from "@desk-framework/test";

describe("Bindings", () => {
	test("Constructor without params", () => {
		expect(() => new Binding())
			.not.toThrowError()
			.toHaveProperty("isManagedBinding");
		expect(String(new Binding())).toBe("bound()");
	});

	test("Constructor with empty string", () => {
		expect(() => new Binding(""))
			.not.toThrowError()
			.toHaveProperty("isManagedBinding");
	});

	test("Global variants with empty string", () => {
		expect(() => bound(""))
			.not.toThrowError()
			.toHaveProperty("isManagedBinding");
		expect(() => bound.number(""))
			.not.toThrowError()
			.toHaveProperty("isManagedBinding");
		expect(() => bound.string(""))
			.not.toThrowError()
			.toHaveProperty("isManagedBinding");
		expect(() => bound.boolean(""))
			.not.toThrowError()
			.toHaveProperty("isManagedBinding");
		expect(() => bound.not(""))
			.not.toThrowError()
			.toHaveProperty("isManagedBinding");
		expect(() => bound.list(""))
			.not.toThrowError()
			.toHaveProperty("isManagedBinding");
	});

	test("Constructor with invalid argument", () => {
		expect(() => new Binding({} as any)).toThrowError();
	});

	test("Constructor with path", () => {
		let b = new Binding("x.y");
		expect(b.isManagedBinding()).toBe(true);
		expect(b).asString().toMatchRegExp(/x\.y/);
	});

	test("Constructor with path and filters", () => {
		let b = new Binding("!x.y|!|!");
		expect(b.isManagedBinding()).toBe(true);
	});

	describe("Basic bindings", () => {
		function setup() {
			class TestObject extends ManagedObject {
				constructor() {
					super();

					// add auto-attached properties
					this.observeAttach("other");
					this.observeAttach("child");

					// add mechanics for dynamic property x
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

				/** Regular properties */
				a?: number = 1;
				aa = 123;
				obj? = { foo: "bar" };

				/** Attached objects */
				child = new ChildObject();
				other?: ChildObject;

				/** Property using getter/setter */
				declare x: number;
			}
			class ChildObject extends ManagedObject {
				constructor() {
					super();
					this.observeAttach("nested");
				}
				aa?: number;
				dd?: number;
				declare nested?: ChildObject;

				/** Object property with getter/setter to avoid being watched */
				get nonObservedObject() {
					return this._object;
				}
				set nonObservedObject(v: ChildObject | undefined) {
					this._object = v;
				}
				private _object?: ChildObject;

				addAABinding(b: string | Binding) {
					(b instanceof Binding ? b : bound(b)).bindTo(this, "aa");
				}
				addDDBinding(b: string) {
					bound(b).bindTo(this, "dd");
				}
			}
			return { TestObject, ChildObject };
		}

		test("Single binding", () => {
			let { TestObject } = setup();
			let c = new TestObject();
			c.child.addAABinding("a");
			expect(c.child).toHaveProperty("aa").toBe(1);
		});

		test("Single binding, same property name", () => {
			let { TestObject } = setup();
			let c = new TestObject();
			c.child.addAABinding("aa");
			expect(c.child).toHaveProperty("aa").toBe(123);
		});

		test("Single binding, update", () => {
			let { TestObject } = setup();
			let c = new TestObject();
			c.child.addAABinding("a");
			c.a = 2;
			expect(c.child).toHaveProperty("aa").toBe(2);
		});

		test("Single binding, update from setter", () => {
			let { TestObject } = setup();
			let c = new TestObject();
			c.child.addAABinding("x");
			c.x = 2;
			expect(c.child).toHaveProperty("aa").toBe(2);
		});

		test("Binding on subclass", () => {
			let { TestObject } = setup();
			class SubObject extends TestObject {
				constructor() {
					super();
					let d: number;
					Object.defineProperty(this, "d", {
						configurable: true,
						get() {
							return d;
						},
						set(v) {
							d = +v;
						},
					});
				}
				declare d: number | string;
			}
			let c = new SubObject();
			c.child.addAABinding("a");
			expect(c.child).toHaveProperty("aa").toBe(1);
			c.d = "2";
			c.child.addDDBinding("d");
			expect(c.child).toHaveProperty("dd").toBe(2);
		});

		test("Single binding, delete property", () => {
			// Note: this doesn't actually work!
			// Don't delete bound properties...
			let { TestObject } = setup();
			let c = new TestObject();
			c.child.addAABinding("a");
			expect(c.child).toHaveProperty("aa").toBe(1);
			delete c.a;
			expect(c.child).toHaveProperty("aa").toBe(1);
		});

		test("Single binding with 2-step path", () => {
			let { TestObject, ChildObject } = setup();
			let c = new TestObject();
			c.child.nested = new ChildObject();
			c.child.nested.addAABinding("child.aa");
			c.child.aa = 3;
			expect(c.child.nested).toHaveProperty("aa").toBe(3);
		});

		test("Single binding with 2-step path, change first", () => {
			let { TestObject, ChildObject } = setup();
			let c = new TestObject();
			c.other = new ChildObject();
			c.child.addAABinding("other.aa");
			c.other.aa = 3;
			expect(c.child).toHaveProperty("aa").toBe(3);
			c.other = new ChildObject();
			expect(c.child).toHaveProperty("aa").toBeUndefined();
			c.other.aa = 4;
			expect(c.child).toHaveProperty("aa").toBe(4);
		});

		test("Single binding with 2-step path, delete first", () => {
			let { TestObject, ChildObject } = setup();
			let c = new TestObject();
			c.other = new ChildObject();
			c.child.addAABinding("other.aa");
			c.other.aa = 3;
			expect(c.child).toHaveProperty("aa").toBe(3);
			c.other = undefined;
			expect(c.child).toHaveProperty("aa").toBeUndefined();
		});

		test("Single binding, move target", () => {
			let { TestObject, ChildObject } = setup();
			let c = new TestObject();
			c.child.nested = new ChildObject();
			// make nested child aa binding refer to child.aa:
			c.child.nested.addAABinding("aa");
			c.child.aa = 3;
			expect(c.child.nested).toHaveProperty("aa").toBe(3);
			c.child = c.child.nested;
			// aa binding now refers to parent.aa:
			expect(c.child).toHaveProperty("aa").toBe(123);
		});

		test("Single binding with 3-step path", () => {
			let { TestObject, ChildObject } = setup();
			let c = new TestObject();
			c.child.nested = new ChildObject();
			c.child.nested.nested = new ChildObject();
			c.child.nested.nested.addAABinding("child.nested.aa");
			c.child.nested.aa = 3;
			expect(c.child.nested.nested).toHaveProperty("aa").toBe(3);
		});

		test("Single binding with 3-step path, change first", () => {
			let { TestObject, ChildObject } = setup();
			let c = new TestObject();
			c.other = new ChildObject();
			c.other.nested = new ChildObject();
			c.child.addAABinding("other.nested.aa");
			c.other.nested.aa = 3;
			expect(c.child).toHaveProperty("aa").toBe(3);
			let newOther = new ChildObject();
			newOther.nested = new ChildObject();
			newOther.nested.aa = 4;
			c.other = newOther;
			expect(c.child).toHaveProperty("aa").toBe(4);
		});

		test("Single binding with 3-step path, unlink first", () => {
			let { TestObject, ChildObject } = setup();
			let c = new TestObject();
			c.other = new ChildObject();
			c.other.nested = new ChildObject();
			c.child.addAABinding("other.nested.aa");
			c.other.nested.aa = 3;
			expect(c.child).toHaveProperty("aa").toBe(3);
			c.other.unlink();
			expect(c.child).toHaveProperty("aa").toBeUndefined();
		});

		test("Single binding with 4-step path though non-state object ref", () => {
			let { TestObject, ChildObject } = setup();
			let c = new TestObject();
			c.other = new ChildObject();
			c.other.nonObservedObject = new ChildObject();
			c.other.nonObservedObject.nested = new ChildObject();
			c.other.nonObservedObject.nested.aa = 3;
			c.child.addAABinding("other.nonObservedObject.nested.aa");
			expect(c.child).toHaveProperty("aa").toBe(3);
			c.other.nonObservedObject.nested.aa = 4;
			expect(c.child).toHaveProperty("aa").toBe(3);
			c.other.unlink();
			expect(c.child).toHaveProperty("aa").toBeUndefined();
		});

		test("Update non-state binding using change event", () => {
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
					bound("changeable.nonObserved").bindTo(this, "a");
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
			expect(p.bound).toHaveProperty("a").toBe(1);
			p.changeable.nonObserved = 2;
			expect(p.bound).toHaveProperty("a").toBe(1);
			p.changeable.emitChange();
			expect(p.bound).toHaveProperty("a").toBe(2);
		});

		test("Bind to property of managed list item: indexed, first, last", (t) => {
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
					bound(b).bindTo(this, "a");
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

			t.log("Testing list with zero items");
			expect(p)
				.toHaveProperty("boundIndex")
				.toHaveProperty("a")
				.toBeUndefined();
			expect(p)
				.toHaveProperty("boundFirst")
				.toHaveProperty("a")
				.toBeUndefined();
			expect(p).toHaveProperty("boundLast").toHaveProperty("a").toBeUndefined();

			t.log("Testing list with 1 item");
			p.list.add(new ListItem(1));
			expect(p).toHaveProperty("boundIndex").toHaveProperty("a").toBe(1);
			expect(p).toHaveProperty("boundFirst").toHaveProperty("a").toBe(1);
			expect(p).toHaveProperty("boundLast").toHaveProperty("a").toBe(1);

			t.log("Testing list with 2 items");
			p.list.insert(new ListItem(2), p.list.first());
			expect(p).toHaveProperty("boundIndex").toHaveProperty("a").toBe(2);
			expect(p).toHaveProperty("boundFirst").toHaveProperty("a").toBe(2);
			expect(p).toHaveProperty("boundLast").toHaveProperty("a").toBe(1);
		});

		test("Binding to plain object property", () => {
			let { TestObject, ChildObject } = setup();
			let c = new TestObject();
			c.child = new ChildObject();
			c.child.addAABinding("obj.foo");
			expect(c.child).toHaveProperty("aa").toBe("bar");
			c.obj = { foo: "baz" };
			expect(c.child).toHaveProperty("aa").toBe("baz");
			c.obj = undefined;
			expect(c.child).toHaveProperty("aa").toBeUndefined();
		});

		test("Binding non-observable property: error", (t) => {
			expect(
				t.tryRun(() => {
					class Child extends ManagedObject {
						constructor() {
							super();
							bound("nonObserved").bindTo(this, "nonObserved");
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
				}),
			)
				.asString()
				.toMatchRegExp(/observable/);
		});

		test("Debug handler", (t) => {
			let { TestObject } = setup();
			class DebugObserver extends Observer<GlobalEmitter<Binding.DebugEvent>> {
				override observe(observed: any) {
					t.count("start");
					return super.observe(observed);
				}
				onDebug(e: Binding.DebugEvent) {
					if (e.data.binding.toString() !== "bound(a)")
						t.fail("Binding mismatch");
					if (e.data.value !== 1) t.fail("Value mismatch");
					t.count("debug");
				}
			}
			let observer = new DebugObserver().observe(Binding.debugEmitter);
			try {
				t.expectCount("start").toBe(1);
				let c = new TestObject();
				c.child.addAABinding(bound("a").debug());
				t.expectCount("debug").toBe(1);
				expect(Binding.debugEmitter.isObserved()).toBeTruthy();
				observer.stop();
				expect(Binding.debugEmitter.isObserved()).toBeFalsy();
				c.a = 2;
				t.expectCount("debug").toBe(1);
			} finally {
				observer.stop();
			}
		});

		test("Volume test", () => {
			class AnotherObject extends ManagedObject {
				constructor() {
					super();
					for (let i = 0; i < 26; i++)
						this.bindLetter(String.fromCharCode("a".charCodeAt(0) + i));
				}
				bindLetter(letter: string) {
					bound("a").bindTo(this, letter as any);
				}
			}
			class BaseObject extends ManagedObject {
				constructor() {
					super();
					this.observeAttach("nest");
					for (let i = 0; i < 26; i++) {
						let letter = String.fromCharCode("a".charCodeAt(0) + i);
						(this as any)[letter] = new AnotherObject();
						this.observeAttach(letter as any);
					}
				}
				declare nest: BaseObject;
				declare a?: AnotherObject;
			}
			let c = new BaseObject();
			let n = (c.nest = new BaseObject());
			c.a = undefined;
			n.unlink();
			expect(c.nest).toBeUndefined();
			expect(n.a).toBeUndefined();
		});

		test("Single binding on unlinked shouldn't fail, but also not work", () => {
			let { TestObject } = setup();
			let c = new TestObject();
			let child = c.child;
			child.unlink();
			child.addAABinding("a");
			c.a = 123;
			expect(child.aa).toBeUndefined();
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
					bound(b).bindTo(this, "list");
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
			expect(parent.child).toHaveProperty("list").toBe(newList);
		});

		test("Can bind ManagedList to other instance, then remove", () => {
			let { Parent } = setup();
			let parent = new Parent();
			let newList = new ManagedList();
			parent.value = newList;
			parent.child.bindList("value");
			expect(parent.child).toHaveProperty("list").toBe(newList);
			parent.value = undefined;
			expect(parent.child).toHaveProperty("list").toBeUndefined();
		});

		test("Shouldn't bind to `count` within list", () => {
			class Child extends ManagedObject {
				constructor() {
					super();
					bound("count").bindTo(this, "count");
				}
				count?: number;
			}
			class Parent extends ManagedObject {
				count = 123;
				list = this.attach(new ManagedList(new Child()));
			}
			let p = new Parent();
			expect(p.list.first()).toHaveProperty("count").toBe(123);
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
					return expect(this).toHaveProperty("value");
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
			parent.child.bindValue(bound("noStateProperty", defaultValue));
			parent.child.expectValue().toBe(defaultValue);
		});

		test("Single negation", () => {
			let { parent } = setup();
			parent.child.bindValue(bound("!value1"));
			parent.child.expectValue().toBe(false);
		});

		test("Double negation", () => {
			let { parent } = setup();
			parent.child.bindValue(bound("!!value1"));
			parent.child.expectValue().toBe(true);
		});

		test("Single negation on non-existent property", () => {
			let { parent } = setup();
			parent.child.bindValue(bound("!nonExistent"));
			parent.child.expectValue().toBe(true);
		});

		test("Double negation on non-existent property", () => {
			let { parent } = setup();
			parent.child.bindValue(bound("!!nonExistent"));
			parent.child.expectValue().toBe(false);
		});

		test("Convert: not", () => {
			let { parent } = setup();
			parent.child.bindValue(bound("value1").not());
			parent.child.expectValue().toBe(false);
			parent.value1 = 0;
			parent.child.expectValue().toBe(true);
		});

		test("Convert: bound.not", () => {
			let { parent } = setup();
			parent.child.bindValue(bound.not("value1"));
			parent.child.expectValue().toBe(false);
			parent.value1 = 0;
			parent.child.expectValue().toBe(true);
		});

		test("Convert: asBoolean", () => {
			let { parent } = setup();
			parent.child.bindValue(bound("value1").asBoolean());
			parent.child.expectValue().toBe(true);
			parent.value1 = 0;
			parent.child.expectValue().toBe(false);
		});

		test("Convert: bound.boolean", () => {
			let { parent } = setup();
			parent.child.bindValue(bound.boolean("value1"));
			parent.child.expectValue().toBe(true);
			parent.value1 = 0;
			parent.child.expectValue().toBe(false);
		});

		test("Convert: asString", () => {
			let { parent } = setup();
			parent.child.bindValue(bound("value1").asString());
			parent.child.expectValue().toBe("1");
			parent.value1 = 0;
			parent.child.expectValue().toBe("0");
			parent.value1 = undefined as any;
			parent.child.expectValue().toBe("");
		});

		test("Convert and format: asString(format) with number", () => {
			let { parent } = setup();
			parent.child.bindValue(bound("value1").asString(".2f"));
			parent.child.expectValue().toBe("1.00");
			parent.value1 = 0;
			parent.child.expectValue().toBe("0.00");
			parent.value1 = undefined as any;
			parent.child.expectValue().toBe("NaN");
		});

		test("Convert and format: asString(format) with string", () => {
			let { parent } = setup();
			parent.child.bindValue(bound("str").asString("lc"));
			parent.child.expectValue().toBe("");
			parent.str = "ABC";
			parent.child.expectValue().toBe("abc");
		});

		test("Convert: bound.string", () => {
			let { parent } = setup();
			parent.child.bindValue(bound.string("value1"));
			parent.child.expectValue().toBe("1");
			parent.value1 = 0;
			parent.child.expectValue().toBe("0");
			parent.value1 = undefined as any;
			parent.child.expectValue().toBe("");
		});

		test("Convert: asNumber", () => {
			let { parent } = setup();
			parent.child.bindValue(bound("str").asNumber());
			parent.child.expectValue().toBeNaN();
			parent.str = "1.5";
			parent.child.expectValue().toBe(1.5);
		});

		test("Convert: bound.number", () => {
			let { parent } = setup();
			parent.child.bindValue(bound.number("str"));
			parent.child.expectValue().toBeNaN();
			parent.str = "1.5";
			parent.child.expectValue().toBe(1.5);
		});

		test("Convert: asList", () => {
			let { parent } = setup();
			parent.child.bindValue(bound("list").asList());
			parent.child.expectValue().toBeUndefined();
			parent.list = ["a", "b"];
			parent.child.expectValue().toBeArray(["a", "b"]);
			parent.list = 123;
			parent.child.expectValue().toBeUndefined();
		});

		test("Convert: bound.list", () => {
			let { parent } = setup();
			parent.child.bindValue(bound.list("list"));
			parent.child.expectValue().toBeUndefined();
			parent.list = ["a", "b"];
			parent.child.expectValue().toBeArray(["a", "b"]);
		});

		test("Matches: single parameter", () => {
			let { parent } = setup();
			parent.child.bindValue(bound("value1").matches(1));
			parent.child.expectValue().toBe(true);
			parent.value1 = 0;
			parent.child.expectValue().toBe(false);
		});

		test("Matches: multiple parameters", () => {
			let { parent } = setup();
			parent.child.bindValue(bound("value1").matches(3, 2, 1));
			parent.child.expectValue().toBe(true);
			parent.value1 = 0;
			parent.child.expectValue().toBe(false);
		});

		test("Select value", () => {
			let { parent } = setup();
			parent.child.bindValue(bound("value1").select(123));
			parent.child.expectValue().toBe(123);
			parent.value1 = 0;
			parent.child.expectValue().toBeUndefined();
		});

		test("Else value", () => {
			let { parent } = setup();
			parent.child.bindValue(bound("value1").else(123));
			parent.child.expectValue().toBe(1);
			parent.value1 = 0;
			parent.child.expectValue().toBe(123);
		});

		test("Select-else single call", () => {
			let { parent } = setup();
			parent.child.bindValue(bound("value1").select(123, 321));
			parent.child.expectValue().toBe(123);
			parent.value1 = 0;
			parent.child.expectValue().toBe(321);
		});

		test("Select-else combination", () => {
			let { parent } = setup();
			parent.child.bindValue(bound("value1").select(123).else(321));
			parent.child.expectValue().toBe(123);
			parent.value1 = 0;
			parent.child.expectValue().toBe(321);
		});

		test("And-binding", () => {
			let { parent } = setup();
			parent.child.bindValue(bound("value1").and(bound("value2")));
			parent.child.expectValue().toBe(2);
			parent.value2 = 0;
			parent.child.expectValue().toBe(0);
			parent.value1 = 0;
			parent.child.expectValue().toBe(0);
			parent.value2 = 2;
			parent.child.expectValue().toBe(0);

			// make sure bound value doesn't get updated until both values known
			expect(parent.child.updates).asJSONString().toBe("[2,0]");
		});

		test("Or-binding", () => {
			let { parent } = setup();
			parent.child.bindValue(bound("value1").or(bound("value2")));
			parent.child.expectValue().toBe(1);
			parent.value2 = 0;
			parent.child.expectValue().toBe(1);
			parent.value1 = 0;
			parent.child.expectValue().toBe(0);
			parent.value2 = 2;
			parent.child.expectValue().toBe(2);

			// make sure bound value doesn't get updated until both values known
			expect(parent.child.updates).asJSONString().toBe("[1,0,2]");
		});

		test("And-binding, 3 terms", () => {
			let { parent } = setup();
			parent.child.bindValue(bound("value1").and("value2").and("value3"));
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
			parent.child.bindValue(bound("value1").or("value2").or("value3"));
			parent.value1 = 0;
			parent.value2 = 0;
			parent.value3 = 0;
			expect(parent.child.updates).asJSONString().toBe("[1,2,3,0]");
		});

		test("And-Or-binding", () => {
			let { parent } = setup();
			parent.child.bindValue(bound("value1").and("value2").or("value3"));
			parent.value1 = 0;
			parent.value2 = 0;
			parent.value3 = 0;
			expect(parent.child.updates).asJSONString().toBe("[2,3,0]");
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
					return expect(this).toHaveProperty("value");
				}
			}

			return { parent: new Parent() };
		}

		test("String binding without arguments", () => {
			let { parent } = setup();
			let binding = bound.strf("Abc");
			expect(String(binding)).toBe('bound.strf("Abc")');
			parent.child.bindValue(binding);
			parent.child.expectValue().asString().toBe("Abc");
		});

		test("Basic string binding", () => {
			let { parent } = setup();
			parent.child.bindValue(bound.strf("Abc %s", "str"));
			parent.child.expectValue().asString().toBe("Abc ABC");
		});

		test("Basic string binding with Binding instance", () => {
			let { parent } = setup();
			parent.child.bindValue(bound.strf("Abc %s", bound("str")));
			parent.child.expectValue().asString().toBe("Abc ABC");
		});

		test("Basic string binding with Binding.strf method and .asString", () => {
			let { parent } = setup();
			parent.child.bindValue(bound("str").strf("Abc %{lc}").asString());
			parent.child.expectValue().toBe("Abc abc");
		});

		test("Multiple value string binding", () => {
			let { parent } = setup();
			parent.child.bindValue(
				bound.strf("Value: %.2f %s: %i", "value1", "str", "value1").asString(),
			);
			parent.child.expectValue().toBe("Value: 1.00 ABC: 1");
		});

		test("Named string binding using %[...]", () => {
			let { parent } = setup();
			parent.child.bindValue(bound.strf("Abc %[foo]", { foo: "str" }));
			parent.child.expectValue().asString().toBe("Abc ABC");
		});

		test("Named string binding using %[...], nonexistent property", () => {
			let { parent } = setup();
			parent.child.bindValue(bound.strf("Abc %[bar]", { foo: "str" }));
			parent.child.expectValue().asString().toBe("Abc ");
		});

		test("Multiple value named string binding using %[...]", () => {
			let { parent } = setup();
			parent.child.bindValue(
				bound.strf(
					"Value: %[value:.2f] %[str]: %[value:n] %[value:plural|a|b]",
					{
						value: "value1",
						str: "str",
					},
				),
			);
			parent.child.expectValue().asString().toBe("Value: 1.00 ABC: 1 a");
		});
	});
});
