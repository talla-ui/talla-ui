import { ManagedObject } from "../../../dist/index.js";
import { describe, expect, test } from "@desk-framework/frame-test";

describe("ManagedObject", () => {
	test("Constructor", () => {
		class C extends ManagedObject {}
		let c = new C();
		expect(c).toBeInstanceOf(ManagedObject);
		expect(c.isUnlinked()).not.toBeTruthy();
	});

	test("Basic unlinking", () => {
		class C extends ManagedObject {}
		let c = new C();
		expect(() => c.unlink()).not.toThrowError();
		expect(c.isUnlinked()).toBeTruthy();

		// unlink again, should be fine
		expect(() => c.unlink()).not.toThrowError();
		expect(c.isUnlinked()).toBeTruthy();
	});

	test("Unlinking invokes beforeUnlink method", (t) => {
		class C extends ManagedObject {
			override beforeUnlink() {
				t.count("unlink");
			}
		}
		let c = new C();
		c.unlink();
		c.unlink(); // not called again
		t.expectCount("unlink").toBe(1);
	});

	describe("Basic attached managed objects", () => {
		let id = 0;

		class AnotherObject extends ManagedObject {
			id = id++;
		}
		class ChildObject extends ManagedObject {
			id = id++;
			readonly another = this.attach(new AnotherObject());
		}
		class TestObject extends ManagedObject {
			constructor() {
				super();
				this.autoAttach("child");
			}
			id = id++;
			child?: ChildObject = new ChildObject();
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
			expect(ManagedObject.whence(another)).toBe(child);
			expect(ManagedObject.whence(child)).toBe(parent);
			expect(ManagedObject.whence(parent)).toBeUndefined();
			expect(ManagedObject.whence()).toBeUndefined();
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

		test("Unlink children by setting property", () => {
			let { parent, child, another } = setup();
			parent.child = undefined;
			expect(another.isUnlinked(), "another is unlinked").toBeTruthy();
			expect(child.isUnlinked(), "child is unlinked").toBeTruthy();
		});

		test("Unlink children, check references", () => {
			let { parent, child } = setup();
			child.unlink();
			expect(parent).toHaveProperty("child").toBeUndefined();
			expect(child).toHaveProperty("another").toBeDefined();
		});

		test("Move child to new parent", () => {
			let { child, another } = setup();
			let newParent = new TestObject();
			let oldNewChild = newParent.child!;
			newParent.child = child;
			expect(newParent.child).toHaveProperty("id").toBe(child.id);
			expect(oldNewChild.isUnlinked()).toBeTruthy();
			expect(child.isUnlinked()).toBeFalsy();
			expect(another.isUnlinked()).toBeFalsy();
		});

		test("Enforce strict hierarchy without loops", () => {
			class MyLoop extends ManagedObject {
				constructor() {
					super();
					this.autoAttach("loop");
				}
				loop?: MyLoop;
				attachLoop() {
					this.attach(this);
				}
			}
			let parent = new MyLoop();
			expect(parent).toHaveProperty("loop").toBeUndefined();
			parent.loop = parent;
			expect(ManagedObject.whence(parent)).toBeUndefined();
			parent.loop = new MyLoop();
			parent.loop!.loop = parent;
			expect(ManagedObject.whence(parent)).toBeUndefined();
			parent.loop.loop = new MyLoop();
			parent.loop!.loop!.loop = parent;
			expect(ManagedObject.whence(parent)).toBeUndefined();
			parent.loop!.loop!.loop = undefined;
			expect(parent.isUnlinked()).toBeFalsy();
			expect(() => parent.attachLoop()).toThrowError();
		});
	});
});
