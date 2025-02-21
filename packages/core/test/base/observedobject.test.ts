import { beforeEach, describe, expect, test } from "vitest";
import { AppContext, ObservedEvent, ObservedObject } from "../../dist/index.js";

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
	class C extends ObservedObject {}
	let c = new C();
	expect(c).toBeInstanceOf(ObservedObject);
	expect(c.isUnlinked()).not.toBeTruthy();
});

test("Basic unlinking", () => {
	class C extends ObservedObject {}
	let c = new C();
	expect(() => c.unlink()).not.toThrowError();
	expect(c.isUnlinked()).toBeTruthy();

	// unlink again, should be fine
	expect(() => c.unlink()).not.toThrowError();
	expect(c.isUnlinked()).toBeTruthy();
});

test("Unlinking invokes beforeUnlink method", () => {
	let unlinked = 0;
	class C extends ObservedObject {
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
		class MyObject extends ObservedObject {
			foo = "foo";
		}
		let c = new MyObject();
		let values: any[] = [];
		ObservedObject.observe(c, ["foo"], (object, p, value) => {
			expect(object).toBe(c);
			expect(p).toBe("foo");
			values.push(value);
		});
		c.foo = "bar";
		c.foo = "bar";
		c.foo = "baz";
		expect(values).toEqual(["bar", "baz"]);
	});

	test("Cannot observe unlinked object", () => {
		let c = new ObservedObject();
		c.unlink();
		expect(() =>
			ObservedObject.observe(c, ["foo"] as any, () => {}),
		).toThrowError();
	});
});

describe("Basic attached observed objects", () => {
	let id = 0;

	class AnotherObject extends ObservedObject {
		id = id++;
	}
	class ChildObject extends ObservedObject {
		id = id++;
		readonly another = this.attach(new AnotherObject());
	}
	class TestObject extends ObservedObject {
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
		expect(ObservedObject.whence(another)).toBe(child);
		expect(ObservedObject.whence(child)).toBe(parent);
		expect(ObservedObject.whence(parent)).toBeUndefined();
		expect(ObservedObject.whence()).toBeUndefined();
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
		class TestObject extends ObservedObject {
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
		class TestObject extends ObservedObject {
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
		class TestObject extends ObservedObject {
			constructor() {
				super();
				this.child = this.attach(new ChildObject(), { delegate: this });
			}
			delegate(e: ObservedEvent) {
				if (e.source !== this.child) throw Error("Not the same object");
				events.push(e.name);
			}
			child: ChildObject;
		}
		let parent = new TestObject();
		parent.child.emit("Foo");
		parent.listen((e) => {
			events.push(e.name);
			if (e.delegate !== parent) throw new Error("Invalid delegate");
		});
		parent.child.emit("Foo");
		parent.child.unlink();
		expect(events).toEqual(["Foo", "Foo", "Foo"]);
	});

	test("Async event delegate, expect to catch error", async () => {
		let p = new Promise((r) => setTimeout(r, 1));
		class TestObject extends ObservedObject {
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
		class TestObject extends ObservedObject {
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
		class TestObject extends ObservedObject {
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

	test("Enforce strict hierarchy without loops", () => {
		class MyLoop extends ObservedObject {
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
		let root = new ObservedObject();
		ObservedObject.makeRoot(root);
		let parent = new ObservedObject();
		expect(() => (parent as any).attach(root)).toThrowError();
	});

	test("Cannot root attached object", () => {
		let root = new ObservedObject();
		let parent = new ObservedObject();
		(parent as any).attach(root);
		expect(() => ObservedObject.makeRoot(root)).toThrowError();
	});
});
