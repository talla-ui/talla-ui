import { beforeEach, describe, expect, test } from "vitest";
import {
	AppContext,
	ObservableEvent,
	ObservableObject,
} from "../../dist/index.js";

let numErrors = 0;
let pendingError: any;
beforeEach((c) => {
	numErrors = 0;
	pendingError = undefined;
	AppContext.setErrorHandler((e) => {
		numErrors++;
		pendingError ||= e;
		c.onTestFinished(() => {
			if (pendingError) throw pendingError;
		});
	});
});

test("Constructor", () => {
	class C extends ObservableObject {}
	let c = new C();
	expect(c).toBeInstanceOf(ObservableObject);
	expect(c.isUnlinked()).not.toBeTruthy();
});

test("Basic unlinking", () => {
	class C extends ObservableObject {}
	let c = new C();
	expect(() => c.unlink()).not.toThrowError();
	expect(c.isUnlinked()).toBeTruthy();

	// unlink again, should be fine
	expect(() => c.unlink()).not.toThrowError();
	expect(c.isUnlinked()).toBeTruthy();
});

test("Unlinking invokes beforeUnlink method", () => {
	let unlinked = 0;
	class C extends ObservableObject {
		override beforeUnlink() {
			unlinked++;
		}
	}
	let c = new C();
	c.unlink();
	c.unlink(); // not called again
	expect(unlinked).toBe(1);
});

describe("Observe properties", () => {
	test("Observe single property", () => {
		class MyObject extends ObservableObject {
			foo = "foo";
		}
		let c = new MyObject();
		let values: any[] = [];
		c.observe("foo", function (value) {
			expect(this).toBe(c);
			values.push(value);
		});
		c.foo = "bar";
		c.foo = "bar";
		c.foo = "baz";
		expect(values).toEqual(["bar", "baz"]);
	});

	test("Cannot observe unlinked object", () => {
		let c = new ObservableObject();
		c.unlink();
		expect(() => c.observe("foo" as any, () => {})).toThrowError();
	});

	test("Observe observable object", () => {
		let c = new ObservableObject();
		let o = new ObservableObject();
		let count = 0;
		c.observe(o, (object) => {
			expect(object).toBe(o);
			count++;
		});
		o.emitChange(); // count should be 1
		o.emitChange(); // count should be 2
		c.unlink();
		o.emitChange(); // not handled
		expect(count).toBe(3);
	});

	test("Observe property with observable object", () => {
		let o1 = new ObservableObject();
		let o2 = new ObservableObject();
		let c = Object.assign(new ObservableObject(), {
			foo: o1 as ObservableObject | undefined,
		});
		let objects: any[] = [];
		c.observe("foo", (object) => {
			objects.push(object);
		});
		o1.emitChange();
		o1.emitChange();
		expect(objects).toEqual([o1, o1]);
		c.foo = o2;
		expect(objects).toEqual([o1, o1, o2]);
		o2.emitChange();
		o2.unlink();
		expect(objects).toEqual([o1, o1, o2, o2]);
		c.foo = undefined;
		c.foo = o1;
		expect(objects).toEqual([o1, o1, o2, o2, undefined, o1]);
		c.foo.unlink();
		o1.emitChange();
		expect(objects).toEqual([o1, o1, o2, o2, undefined, o1]);
	});
});

describe("Basic attached observable objects", () => {
	let id = 0;

	class AnotherObject extends ObservableObject {
		id = id++;
	}
	class ChildObject extends ObservableObject {
		id = id++;
		readonly another = this.attach(new AnotherObject());
	}
	class TestObject extends ObservableObject {
		constructor(child: ChildObject = new ChildObject()) {
			super();
			this.child = this.attach(child);
		}
		id = id++;
		child: ChildObject;
	}

	function setup() {
		let parent = new TestObject();
		return { parent, child: parent.child!, another: parent.child!.another! };
	}

	test("Basic structure", () => {
		let { parent, child, another } = setup();
		expect(parent).toBeInstanceOf(TestObject);
		expect(child).toBeInstanceOf(ChildObject);
		expect(another).toBeInstanceOf(AnotherObject);
	});

	test("Find parent", () => {
		let { parent, child, another } = setup();
		expect(ObservableObject.whence(another)).toBe(child);
		expect(ObservableObject.whence(child)).toBe(parent);
		expect(ObservableObject.whence(parent)).toBeUndefined();
		expect(ObservableObject.whence()).toBeUndefined();
	});

	test("Find parent of type", () => {
		let { parent, child, another } = setup();
		expect(TestObject.whence(another)).toBe(parent);
		expect(ChildObject.whence(another)).toBe(child);
		expect(ChildObject.whence(child)).toBeUndefined();
	});

	test("Unlink children", () => {
		let { child, another } = setup();
		child.unlink();
		expect(another.isUnlinked()).toBeTruthy();
		expect(child.isUnlinked()).toBeTruthy();
	});

	test("Move child to new parent", () => {
		let { parent, child, another } = setup();
		expect(TestObject.whence(another)).toBe(parent);
		let newParent = new TestObject(child);
		expect(child.isUnlinked()).toBeFalsy();
		expect(another.isUnlinked()).toBeFalsy();
		expect(TestObject.whence(another)).toBe(newParent);
	});

	test("Event handler on attach", () => {
		let events: string[] = [];
		class TestObject extends ObservableObject {
			constructor() {
				super();
				this.child = this.attach(new ChildObject(), (e) => {
					events.push(e.name);
				});
			}
			child: ChildObject;
		}
		let parent = new TestObject();
		parent.child.emit("Foo");
		parent.child.emit("Foo");
		parent.child.unlink();
		expect(events).toEqual(["Foo", "Foo"]);
	});

	test("Event handler on attach, use callback object", () => {
		let events: string[] = [];
		class TestObject extends ObservableObject {
			constructor() {
				super();
				this.child = this.attach(new ChildObject(), {
					handler: (object, e) => {
						if (object !== this.child) throw Error("Not the same object");
						events.push(e.name);
					},
				});
			}
			child: ChildObject;
		}
		let parent = new TestObject();
		parent.child.emit("Foo");
		parent.child.emit("Foo");
		parent.child.unlink();
		expect(events).toEqual(["Foo", "Foo"]);
	});

	test("Event delegate on attach", () => {
		let events: string[] = [];
		class TestObject extends ObservableObject {
			constructor() {
				super();
				this.child = this.attach(new ChildObject(), { delegate: this });
			}
			delegate(e: ObservableEvent) {
				if (e.source !== this.child) throw Error("Not the same object");
				events.push(e.name);
			}
			child: ChildObject;
		}
		let parent = new TestObject();
		parent.child.emit("Foo");
		parent.listen((e) => {
			events.push(e.name);
		});
		parent.child.emit("Foo");
		parent.child.unlink();
		expect(events).toEqual(["Foo", "Foo", "Foo"]);
	});

	test("Async event delegate, expect to catch error", async () => {
		let p = new Promise((r) => setTimeout(r, 1));
		class TestObject extends ObservableObject {
			constructor() {
				super();
				this.child = this.attach(new ChildObject(), { delegate: this });
			}
			async delegate() {
				await p;
				throw Error("Expected error");
			}
			child: ChildObject;
		}
		let parent = new TestObject();
		await expect(
			(async () => {
				parent.child.emit("Foo");
				parent.child.emit("Foo");
				await p; // be sure to wait until after event is handled
				await p;
			})(),
		).resolves.toBeUndefined();
		expect(numErrors).toBe(2);
		pendingError = undefined;
	});

	test("Detach handler on attach, then unlink", () => {
		let detached = 0;
		class TestObject extends ObservableObject {
			constructor() {
				super();
				this.child = this.attach(new ChildObject(), {
					detached: (object) => {
						if (object !== this.child) throw Error("Not the same object");
						detached++;
					},
				});
			}
			child: ChildObject;
		}
		let parent = new TestObject();
		parent.child.unlink();
		expect(detached).toBe(1);
	});

	test("Detach handler on attach, then move", () => {
		let events: string[] = [];
		let detached = 0;
		class TestObject extends ObservableObject {
			constructor(child: ChildObject = new ChildObject()) {
				super();
				this.child = this.attach(child, {
					handler: (_, e) => {
						events.push(e.name);
					},
					detached: (object) => {
						if (object !== this.child) throw Error("Not the same object");
						detached++;
					},
				});
			}
			child: ChildObject;
		}
		let parent = new TestObject();
		parent.child.emit("Foo"); // handled by parent
		new TestObject(parent.child);
		parent.child.emit("Foo"); // handled by parent2
		expect(events).toEqual(["Foo", "Foo"]);
		expect(detached).toBe(1);
	});

	test("Can attach object to same origin", () => {
		class TestObject extends ObservableObject {
			constructor() {
				super();
			}
			attachSame() {
				this.attach(this.child || new TestObject());
			}
			child?: TestObject;
		}
		let parent = new TestObject();
		parent.attachSame();
		expect(() => parent.attachSame()).not.toThrowError();
	});

	test("Enforce strict hierarchy without loops", () => {
		class MyLoop extends ObservableObject {
			loop?: MyLoop;
			attachSelf() {
				this.attach(this);
			}
			attachLoop(loop = new MyLoop()) {
				return (this.loop = this.attach(loop));
			}
		}
		let parent = new MyLoop();
		let loop = parent.attachLoop();
		let loop2 = loop.attachLoop();
		expect(() => loop2.attachLoop(parent)).toThrowError();
		expect(() => parent.attachSelf()).toThrowError();
	});

	test("Cannot attach root object", () => {
		let root = new ObservableObject();
		ObservableObject.makeRoot(root);
		let parent = new ObservableObject();
		expect(() => (parent as any).attach(root)).toThrowError();
	});

	test("Cannot root attached object", () => {
		let root = new ObservableObject();
		let parent = new ObservableObject();
		(parent as any).attach(root);
		expect(() => ObservableObject.makeRoot(root)).toThrowError();
	});
});
