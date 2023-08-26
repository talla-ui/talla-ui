import {
	bound,
	ManagedEvent,
	ManagedObject,
	Observer,
} from "../../../dist/index.js";
import { describe, expect, TestCase, test } from "@desk-framework/test";

describe("Observers", () => {
	class MyObject extends ManagedObject {
		constructor() {
			super();
			this.observeAttach("child");
			let dynamic = false;
			Object.defineProperty(this, "dynamic", {
				configurable: true,
				get() {
					return dynamic;
				},
				set(v) {
					dynamic = v;
				},
			});
		}

		declare child?: MyObject;
		object?: MyObject;

		declare dynamic: boolean;

		get notObservable() {
			return 123;
		}

		foo?: number;
		bar?: number;
		baz?: number;

		bindFoo() {
			bound("foo").bindTo(this, "foo");
		}
	}

	describe("Synchronous observation", () => {
		test("Single event, override handler", (t) => {
			let o = new MyObject();
			class MyObserver extends Observer {
				override handleEvent(e: ManagedEvent) {
					if (e.name === "Change") t.count("event");
				}
			}
			new MyObserver().observe(o);
			o.emitChange();
			t.expectCount("event").toBe(1);
		});

		test("Single event, add multiple observers", (t) => {
			let o = new MyObject();
			class MyObserver extends Observer {
				override handleEvent(e: ManagedEvent) {
					if (e.name === "Change") t.count("event");
				}
			}
			new MyObserver().observe(o);
			new MyObserver().observe(o);
			new MyObserver().observe(o);
			o.emitChange();
			o.emitChange();
			t.expectCount("event").toBe(6);
		});

		test("Can't observe non-managed object", () => {
			class MyObserver extends Observer {}
			expect(() => new MyObserver().observe({} as any)).toThrowError();
			expect(() =>
				new MyObserver().observe(new MyObject()).observe(null as any)
			).toThrowError();
		});

		test("Multiple events, override handleEvent", () => {
			let o = new MyObject();
			let events: string[] = [];
			class MyObserver extends Observer {
				override handleEvent(e: ManagedEvent) {
					events.push(e.name);
				}
			}
			new MyObserver().observe(o);
			o.emit("One");
			o.emit("Two");
			o.emitChange();
			expect(events).toBeArray(["One", "Two", "Change"]);
		});

		test("Single observable property, override handlePropertyChange", (t) => {
			let o = new MyObject();
			class MyObserver extends Observer<MyObject> {
				override observe(observed: MyObject) {
					return super.observe(observed).observeProperty("foo");
				}
				override handlePropertyChange(p: string) {
					if (p === "foo") t.count("change");
				}
			}
			new MyObserver().observe(o);
			o.foo = 123;
			t.expectCount("change").toBe(1);
		});

		test("Multiple observable properties, override handlePropertyChange", () => {
			let o = new MyObject();
			let changes: number[] = [];
			class MyObserver extends Observer<MyObject> {
				override observe(observed: MyObject) {
					return super.observe(observed).observeProperty("foo", "bar", "baz");
				}
				override handlePropertyChange(p: any, v: any) {
					changes.push(v);
				}
			}
			new MyObserver().observe(o);
			o.foo = 1;
			o.bar = 2;
			o.baz = 3;
			o.bar = 4;
			o.foo = 5;
			expect(changes).toBeArray([1, 2, 3, 4, 5]);
		});

		test("Multiple events, separate methods", (t) => {
			let o = new MyObject();
			class MyObserver extends Observer<MyObject> {
				onOne(e: ManagedEvent) {
					if (!(e instanceof ManagedEvent) || e.name !== "One")
						t.fail("Invalid event argument to onOne");
					t.count("one");
				}
				onTwo() {
					t.count("two");
				}
				onChange() {
					t.count("change");
				}
			}
			new MyObserver().observe(o);
			o.emit("One");
			o.emit("Two");
			o.emitChange();
			t.expectCount("one").toBe(1);
			t.expectCount("two").toBe(1);
			t.expectCount("change").toBe(1);
		});

		test("Multiple observable properties, separate methods", () => {
			let o = new MyObject();
			let changes: number[] = [];
			class MyObserver extends Observer<MyObject> {
				override observe(observed: MyObject) {
					return super.observe(observed).observeProperty("foo", "bar", "baz");
				}
				onFooChange(v: any) {
					changes.push(v);
				}
				onBarChange(v: any) {
					changes.push(v);
				}
				onBazChange(v: any) {
					changes.push(v);
				}
			}
			new MyObserver().observe(o);
			o.foo = 1;
			o.bar = 2;
			o.baz = 3;
			o.baz = 3; // shouldn't trigger
			o.bar = 4;
			o.foo = 5;
			expect(changes).toBeArray([1, 2, 3, 4, 5]);
		});

		test("Getter/setter observable property, separate method", (t) => {
			let o = new MyObject();
			let changes: number[] = [];
			class MyObserver extends Observer<MyObject> {
				override observe(observed: MyObject) {
					return super.observe(observed).observeProperty("dynamic");
				}
				onDynamicChange(v: any) {
					changes.push(v);
				}
			}
			new MyObserver().observe(o);
			o.dynamic = false; // still triggers
			o.dynamic = true;
			o.dynamic = true; // still triggers
			o.dynamic = false;
			t.log(changes);
			expect(changes).toBeArray([false, true, true, false]);
		});

		test("Observe change events on nested objects", (t) => {
			let o = new MyObject();
			class MyObserver extends Observer<MyObject> {
				override observe(observed: MyObject) {
					return super.observe(observed).observeProperty("object");
				}
				onObjectChange(v: any, e?: ManagedEvent) {
					t.count("onObjectChange");
					if (!e) t.count("set");
					else t.count(e.name);
				}
			}
			new MyObserver().observe(o);
			o.object = new MyObject();
			o.object.emitChange("MyChange");
			t.expectCount("onObjectChange").toBe(2);
			t.expectCount("set").toBe(1);
			t.expectCount("MyChange").toBe(1);
		});

		test("Observe change events on initial nested objects", (t) => {
			let o = new MyObject();
			class MyObserver extends Observer<MyObject> {
				override observe(observed: MyObject) {
					return super.observe(observed).observeProperty("object");
				}
				onObjectChange() {
					t.count("onObjectChange");
				}
			}
			o.object = new MyObject();
			new MyObserver().observe(o);
			o.object.emitChange();
			t.expectCount("onObjectChange").toBe(1);
		});

		test("Observe change events on child objects", (t) => {
			let o = new MyObject();
			class MyObserver extends Observer<MyObject> {
				override observe(observed: MyObject) {
					return super.observe(observed).observeProperty("child");
				}
				protected onChildChange() {
					t.count("onChildChange");
				}
			}
			new MyObserver().observe(o);
			o.child = new MyObject();
			o.child.emitChange();
			t.expectCount("onChildChange").toBe(2);
		});

		test("Nested objects: change to other object", (t) => {
			let o = new MyObject();
			class MyObserver extends Observer<MyObject> {
				override observe(observed: MyObject) {
					return super.observe(observed).observeProperty("object");
				}
				onObjectChange(v: any, e: ManagedEvent) {
					if (!e) t.count("set");
					else t.count(e.name);
				}
			}
			new MyObserver().observe(o);
			let a = (o.object = new MyObject());
			a.emitChange();
			let b = (o.object = new MyObject());
			a.emitChange();
			b.emitChange();
			t.expectCount("set").toBe(2);
			t.expectCount("Change").toBe(2);
		});

		test("Nested objects: unlink stops observing", (t) => {
			let o = new MyObject();
			class MyObserver extends Observer<MyObject> {
				override observe(observed: MyObject) {
					return super.observe(observed).observeProperty("object");
				}
				onObjectChange(v: any, e: ManagedEvent) {
					if (e) t.count("event");
				}
			}
			new MyObserver().observe(o);
			let a = (o.object = new MyObject());
			a.emitChange();
			a.unlink();
			a.emitChange(); // fails silently
			o.object = undefined;
			o.object = a; // should not listen again
			a.emitChange();
			t.expectCount("event").toBe(1);
		});

		test("Nested objects: unlink child triggers update", (t) => {
			let o = new MyObject();
			class MyObserver extends Observer<MyObject> {
				override observe(observed: MyObject) {
					return super.observe(observed).observeProperty("child");
				}
				onChildChange(v: any) {
					if (v) t.count("set");
					if (!v) t.count("clear");
				}
			}
			new MyObserver().observe(o);
			o.child = new MyObject(); // set
			o.child.unlink(); // clear
			t.expectCount("set").toBe(1);
			t.expectCount("clear").toBe(1);
		});

		test("Nested objects: unlink child stops observing", (t) => {
			let o = new MyObject();
			class MyObserver extends Observer<MyObject> {
				override observe(observed: MyObject) {
					return super.observe(observed).observeProperty("child");
				}
				onChildChange(_v: any, e: ManagedEvent) {
					if (e) t.count("event");
				}
			}
			new MyObserver().observe(o);
			let a = (o.child = new MyObject());
			a.emitChange();
			o.child = new MyObject(); // unlinks a
			a.emitChange(); // fails silently
			t.expectCount("event").toBe(1);
		});

		test("Nested objects: stop method stops observing", (t) => {
			let o = new MyObject();
			class MyObserver extends Observer<MyObject> {
				override observe(observed: MyObject) {
					return super.observe(observed).observeProperty("object");
				}
				onObjectChange(v: any, e: ManagedEvent) {
					if (e) t.count("event");
				}
			}
			let observer = new MyObserver().observe(o);
			let a = (o.object = new MyObject());
			a.emitChange();
			observer.stop();
			a.emitChange(); // not handled
			o.object = undefined;
			o.object = a; // should not listen again
			a.emitChange();
			t.expectCount("event").toBe(1);
		});

		test("Observe unlink", (t) => {
			let o = new MyObject();
			class MyObserver extends Observer<MyObject> {
				override handleUnlink() {
					super.handleUnlink();
					t.count("unlink");
				}
			}
			new MyObserver().observe(o);
			o.unlink();
			o.unlink(); // shouldn't unlink again
			t.expectCount("unlink").toBe(1);
		});

		test("Observe unlink for changed object", (t) => {
			class MyObserver extends Observer<MyObject> {
				override handleUnlink() {
					t.count("unlink");
				}
			}
			let a = new MyObject();
			let observer = new MyObserver().observe(a);
			let b = new MyObject();
			observer.observe(b);
			b.unlink();
			t.expectCount("unlink").toBe(1);
		});

		test("Observe parent", (t) => {
			let o = new MyObject();
			class MyObserver extends Observer<MyObject> {
				protected override handleAttachedChange(parent: ManagedObject) {
					// no need to call super but helps with code coverage:
					super.handleAttachedChange(parent);
					if (!parent || !(parent instanceof ManagedObject)) {
						t.fail("Invalid parent reference");
					}
					t.count("parent");
				}
				protected override handleUnlink() {
					t.count("unlinked");
				}
			}
			let a = new MyObject();
			new MyObserver().observe(a);
			o.child = a; // set parent
			o.child.unlink(); // unlinked
			let b = new MyObject();
			new MyObserver().observe(b);
			o.child = b; // set parent
			let p = new MyObject();
			p.child = b; // set parent again
			t.expectCount("parent").toBe(3);
			t.expectCount("unlinked").toBe(1);
		});

		test("Stop observing events", (t) => {
			let o = new MyObject();
			class MyObserver extends Observer<MyObject> {
				override handleEvent() {
					t.count("event");
				}
			}
			let observer = new MyObserver().observe(o);
			o.emit("One");
			observer.stop();
			o.emit("Two");
			t.expectCount("event").toBe(1);
		});

		test("Stop observing observable properties", (t) => {
			let o = new MyObject();
			class MyObserver extends Observer<MyObject> {
				override observe(observed: MyObject) {
					return super.observe(observed).observeProperty("foo");
				}
				override handlePropertyChange() {
					t.count("change");
				}
			}
			let observer = new MyObserver().observe(o);
			o.foo = 123;
			observer.stop();
			o.foo = 321;
			t.expectCount("change").toBe(1);
		});

		test("Do not throw if attempting to observe non-existent property", () => {
			let o = new MyObject();
			expect(() =>
				(new Observer<MyObject>().observe(o) as any).observeProperty(
					"nonExistent"
				)
			).not.toThrowError();
		});

		test("Throw if attempting to observe non-observable property", () => {
			let o = new MyObject();
			expect(() =>
				(new Observer<MyObject>().observe(o) as any).observeProperty(
					"notObservable"
				)
			).toThrowError();
		});
	});

	describe("Asynchronous state observation", () => {
		test("Single event, async method", async (t) => {
			let o = new MyObject();
			class MyObserver extends Observer {
				onChangeAsync() {
					t.count("event");
				}
			}
			new MyObserver().observe(o);
			o.emitChange();
			t.expectCount("event").toBe(0);
			await t.sleep(1);
			t.expectCount("event").toBe(1);
		});

		test("Multiple events, async method", async (t) => {
			let o = new MyObject();
			class MyObserver extends Observer {
				onChangeAsync() {
					t.count("event");
				}
			}
			new MyObserver().observe(o);
			o.emitChange();
			o.emitChange();
			t.expectCount("event").toBe(0);
			await t.sleep(1);
			t.expectCount("event").toBe(1);
		});

		test("Single observable property, override handler", async (t) => {
			let o = new MyObject();
			class MyObserver extends Observer<MyObject> {
				override observe(observed: MyObject) {
					return super.observe(observed).observePropertyAsync("foo");
				}
				override async handlePropertyChange(p: string) {
					if (p === "foo") t.count("change");
				}
			}
			new MyObserver().observe(o);
			o.foo = 123;
			t.expectCount("change").toBe(0);
			await t.sleep(1);
			t.expectCount("change").toBe(1);
		});

		test("Multiple observable property, override handler", async (t) => {
			let o = new MyObject();
			let changes: number[] = [];
			class MyObserver extends Observer<MyObject> {
				override observe(observed: MyObject) {
					return super
						.observe(observed)
						.observePropertyAsync("foo", "bar", "baz");
				}
				override async handlePropertyChange(_p: any, v: any) {
					changes.push(v);
				}
			}
			new MyObserver().observe(o);
			o.foo = 1;
			o.bar = 2;
			o.baz = 3;
			o.bar = 4;
			o.foo = 5;
			await t.sleep(1);
			expect(changes).toBeArray([5, 4, 3]);
		});

		test("Multiple events, separate methods", async (t) => {
			let o = new MyObject();
			class MyObserver extends Observer<MyObject> {
				onOneAsync(e: ManagedEvent) {
					if (!(e instanceof ManagedEvent) || e.name !== "One")
						t.fail("Invalid event argument to onOneAsync");
					t.count("one");
				}
				onTwoAsync() {
					t.count("two");
				}
				onChangeAsync() {
					t.count("change");
				}
			}
			new MyObserver().observe(o);
			o.emit("One");
			o.emit("Two");
			o.emitChange();
			await t.sleep(1);
			t.expectCount("one").toBe(1);
			t.expectCount("two").toBe(1);
			t.expectCount("change").toBe(1);
		});

		test("Multiple observable properties, separate methods", async (t) => {
			let o = new MyObject();
			let changes: number[] = [];
			class MyObserver extends Observer<MyObject> {
				override observe(observed: MyObject) {
					return super
						.observe(observed)
						.observePropertyAsync("foo", "bar", "baz");
				}
				onFooChange(v: any) {
					changes.push(v);
				}
				onBarChange(v: any) {
					changes.push(v);
				}
				onBazChange(v: any) {
					changes.push(v);
				}
			}
			new MyObserver().observe(o);
			o.foo = 1;
			o.bar = 2;
			o.baz = 3;
			o.bar = 4;
			o.foo = 5;
			await t.sleep(1);
			expect(changes).toBeArray([5, 4, 3]);
		});

		test("Multiple observable properties, separate methods, non Async naming", async (t) => {
			let o = new MyObject();
			let changes: number[] = [];
			class MyObserver extends Observer<MyObject> {
				override observe(observed: MyObject) {
					return super
						.observe(observed)
						.observePropertyAsync("foo", "bar", "baz");
				}
				onFooChange(v: any) {
					changes.push(v);
				}
				onBarChange(v: any) {
					changes.push(v);
				}
				onBazChange(v: any) {
					changes.push(v);
				}
			}
			new MyObserver().observe(o);
			o.foo = 1;
			o.bar = 2;
			o.baz = 3;
			o.bar = 4;
			o.foo = 5;
			await t.sleep(1);
			expect(changes).toBeArray([5, 4, 3]);
		});

		test("Observe change events on nested objects", async (t) => {
			let o = new MyObject();
			class MyObserver extends Observer<MyObject> {
				override observe(observed: MyObject) {
					return super.observe(observed).observePropertyAsync("object");
				}
				onObjectChange(v: any, e?: ManagedEvent) {
					t.count("onObjectChange");
					if (!e) t.count("set");
					else t.count(e.name);
				}
			}
			new MyObserver().observe(o);
			o.object = new MyObject(); // won't be handled
			o.object.emitChange("MyChange"); // will be handled
			await t.sleep(1);
			t.expectCount("onObjectChange").toBe(1);
			t.expectCount("set").toBe(0);
			t.expectCount("MyChange").toBe(1);
		});

		test("Stop observing events", async (t) => {
			let o = new MyObject();
			class MyObserver extends Observer<MyObject> {
				onOneAsync() {
					t.count("one");
				}
				onTwoAsync() {
					t.count("two");
				}
			}
			let observer = new MyObserver().observe(o);
			o.emit("One"); // won't be handled after stop
			observer.stop();
			o.emit("Two"); // won't be handled anyway
			await t.sleep(1);
			t.expectCount("one").toBe(0);
			t.expectCount("two").toBe(0);
		});

		test("Stop observing observable properties", async (t) => {
			let o = new MyObject();
			class MyObserver extends Observer<MyObject> {
				override observe(observed: MyObject) {
					return super.observe(observed).observePropertyAsync("foo");
				}
				override async handlePropertyChange() {
					t.count("change");
				}
			}
			let observer = new MyObserver().observe(o);
			o.foo = 123; // won't be handled after stop
			observer.stop();
			o.foo = 321; // won't be handled anyway
			await t.sleep(1);
			t.expectCount("change").toBe(0);
		});

		test("Observe bound observable property", () => {
			class ParentObject extends ManagedObject {
				readonly myObject = this.attach(new MyObject());
				foo = 123;
			}
			let values: number[] = [];
			class MyObserver extends Observer<MyObject> {
				override observe(observed: MyObject) {
					return super.observe(observed).observeProperty("foo");
				}
				onFooChange(v: any) {
					values.push(v);
				}
			}
			let p = new ParentObject();
			new MyObserver().observe(p.myObject);
			p.myObject.bindFoo(); // sets foo to 123
			expect(p.myObject.foo).toBe(123);
			p.foo = 321; // sets bound property as well
			expect(p.myObject.foo).toBe(321);
			expect(values).toBeArray([123, 321]);
		});
	});

	describe("Change observed object", () => {
		test("Sync change, events", (t) => {
			class MyObserver extends Observer<MyObject> {
				onOne() {
					t.count("one");
				}
			}
			let observer = new MyObserver();
			let o = new MyObject();
			observer.observe(o);
			o.emit("One");
			let p = new MyObject();
			observer.observe(p);
			p.emit("One");
			o.emit("One"); // not handled
			t.expectCount("one").toBe(2);
			expect(observer.observed).toBe(p);
		});

		test("Sync change, observable properties", (t) => {
			class MyObserver extends Observer<MyObject> {
				override observe(object: MyObject) {
					return super.observe(object).observeProperty("foo");
				}
				onFooChange() {
					t.count("set");
				}
			}
			let observer = new MyObserver();
			let o = new MyObject();
			observer.observe(o);
			o.foo = 123;
			let p = new MyObject();
			observer.observe(p);
			p.foo = 123;
			o.foo = 123; // not handled
			t.expectCount("set").toBe(2);
		});

		test("Async change, events", async (t) => {
			class MyObserver extends Observer<MyObject> {
				onOneAsync() {
					t.count("one");
				}
			}
			let observer = new MyObserver();
			let o = new MyObject();
			observer.observe(o);
			o.emit("One"); // not going to be handled
			let p = new MyObject();
			observer.observe(p);
			p.emit("One"); // going to be handled
			o.emit("One"); // not handled at all
			await t.sleep(1);
			t.expectCount("one").toBe(1);
			p.emit("One"); // not handled after stop
			observer.stop();
			await t.sleep(1);
			t.expectCount("one").toBe(1);
		});

		test("Async change, events, catch errors", async (t) => {
			class MyObserver extends Observer<MyObject> {
				onOneAsync() {
					t.count("one");
					throw Error("Catch me");
				}
			}
			let observer = new MyObserver();
			observer.observe(new MyObject());
			observer.observed!.emit("One");
			let error = await t.tryRunAsync(() => t.sleep(1));
			t.expectCount("one").toBe(1);
			expect(error)
				.asString()
				.toMatchRegExp(/Catch me/);
			observer.stop();
		});

		test("Async change, observable properties", async (t) => {
			class MyObserver extends Observer<MyObject> {
				override observe(object: MyObject) {
					return super.observe(object).observePropertyAsync("foo");
				}
				onFooChange() {
					t.count("foo");
				}
			}
			let observer = new MyObserver();
			let o = new MyObject();
			observer.observe(o);
			o.foo = 123; // not handled (async)
			o.foo = 321; // not handled (async)
			let p = new MyObject();
			observer.observe(p);
			p.foo = 123; // handled
			await t.sleep(1);
			t.expectCount("foo").toBe(1);
		});
	});

	describe("Attached observers", () => {
		class MyObserver extends Observer<any> {
			constructor(public test: TestCase) {
				super();
			}
			override observe(observed: MyObject) {
				this.test.count("observe");
				ManagedObject.whence(observed) ||
					this.test.fail("Wrong object observed");
				return super.observe(observed);
			}
			protected override handleUnlink() {
				this.test.count("unlink");
				super.handleUnlink();
			}
			onFoo() {
				this.test.count("event");
			}
		}

		test("Attached once", (t) => {
			class MyObject extends ManagedObject {
				go() {
					let attached = new MyObject();
					this.attach(attached, new MyObserver(t));
					attached.emit("Foo");
				}
			}
			new MyObject().go();
			t.expectCount("observe").toBe(1);
			t.expectCount("event").toBe(1);
		});

		test("Attached once + change: function argument", (t) => {
			class MyObject extends ManagedObject {
				go() {
					let attached = new MyObject();
					this.attach(attached, (target, event) => {
						if (event) t.count("change");
						if (target === attached) t.count("observe");
					});
					attached.emitChange();
				}
			}
			new MyObject().go();
			t.expectCount("observe").toBe(2);
			t.expectCount("change").toBe(1);
		});

		test("Attached from watched property: initial", (t) => {
			class MyObject extends ManagedObject {
				foo?: MyObject;
				go() {
					this.foo = new MyObject();
					this.observeAttach("foo", new MyObserver(t));
					this.foo.emit("Foo");
				}
			}
			new MyObject().go();
			t.expectCount("observe").toBe(1);
			t.expectCount("event").toBe(1);
		});

		test("Attached from watched property + change: initial, function argument", (t) => {
			class MyObject extends ManagedObject {
				foo?: MyObject;
				go() {
					this.foo = new MyObject();
					this.observeAttach("foo", (target, event) => {
						if (event) t.count("change");
						if (target instanceof MyObject) t.count("observe");
					});
					this.foo.emitChange();
				}
			}
			new MyObject().go();
			t.expectCount("observe").toBe(2);
			t.expectCount("change").toBe(1);
		});

		test("Attached from watched property: set after", (t) => {
			class MyObject extends ManagedObject {
				foo?: MyObject;
				go() {
					this.observeAttach("foo", new MyObserver(t));
					this.foo = new MyObject();
					this.foo.emit("Foo");
					this.foo = new MyObject();
					this.foo.emit("Foo");
				}
			}
			new MyObject().go();
			t.expectCount("observe").toBe(2);
			t.expectCount("event").toBe(2);
		});

		test("Attached from watched property: change + set after, function argument", (t) => {
			class MyObject extends ManagedObject {
				foo?: MyObject;
				go() {
					this.observeAttach("foo", (target, event) => {
						if (event) t.count("change");
						if (target instanceof MyObject) t.count("observe");
						else if (!target) t.count("stop");
					});
					this.foo = new MyObject();
					this.foo.emitChange();
					this.foo = new MyObject();
					this.foo.emitChange();
				}
			}
			new MyObject().go();
			t.expectCount("observe").toBe(4);
			t.expectCount("change").toBe(2);
			t.expectCount("stop").toBe(0);
		});

		test("Attached from watched property: set after & unlinked", (t) => {
			class MyObject extends ManagedObject {
				foo?: MyObject;
				go() {
					this.observeAttach("foo", new MyObserver(t));
					this.foo = new MyObject();
					this.foo.emit("Foo");
					this.foo.unlink();
					expect(this.foo).toBeUndefined();
				}
			}
			new MyObject().go();
			t.expectCount("observe").toBe(1);
			t.expectCount("event").toBe(1);
			t.expectCount("unlink").toBe(1);
		});

		test("Attached from watched property: set after + change & unlinked, function argument", (t) => {
			class MyObject extends ManagedObject {
				foo?: MyObject;
				go() {
					this.observeAttach("foo", (target, event) => {
						if (event) t.count("change");
						if (target instanceof MyObject) t.count("observe");
						else if (!target) t.count("stop");
					});
					this.foo = new MyObject();
					this.foo.emitChange();
					this.foo.unlink();
					expect(this.foo).toBeUndefined();
				}
			}
			new MyObject().go();
			t.expectCount("observe").toBe(2);
			t.expectCount("change").toBe(1);
			t.expectCount("stop").toBe(1);
		});

		test("Attached from watched property: set after & moved", (t) => {
			class MyObject extends ManagedObject {
				foo?: MyObject;
				go() {
					this.observeAttach("foo", new MyObserver(t));
					this.foo = new MyObject();
					this.foo.emit("Foo");
					expect(
						// move object, check that it is no longer attached
						ManagedObject.whence(new MyObject().attach(this.foo))
					).not.toBe(this);
					expect(this.foo).toBeUndefined();
					this.foo = new MyObject();
					this.foo.emit("Foo");
				}
			}
			new MyObject().go();
			t.expectCount("observe").toBe(2);
			t.expectCount("event").toBe(2);
		});

		test("Attached from watched property: set after + change & moved, function argument", (t) => {
			class MyObject extends ManagedObject {
				foo?: MyObject;
				go() {
					this.observeAttach("foo", (target, event) => {
						if (event) t.count("change");
						if (target instanceof MyObject) t.count("observe");
						else if (!target) t.count("stop");
					});
					this.foo = new MyObject();
					this.foo.emitChange();
					expect(
						// move object, check that it is no longer attached
						ManagedObject.whence(new MyObject().attach(this.foo))
					).not.toBe(this);
					expect(this.foo).toBeUndefined();
					this.foo = new MyObject();
					this.foo.emitChange();
				}
			}
			new MyObject().go();
			t.expectCount("observe").toBe(4);
			t.expectCount("change").toBe(2);
			t.expectCount("stop").toBe(0);
		});
	});
});
