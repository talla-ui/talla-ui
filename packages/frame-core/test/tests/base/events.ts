import {
	GlobalEmitter,
	ManagedChangeEvent,
	ManagedEvent,
	ManagedObject,
} from "../../../dist/index.js";
import { describe, expect, test } from "@desk-framework/frame-test";

describe("Events", () => {
	test("Constructor", () => {
		let e = new ManagedEvent("Foo", new ManagedObject());
		expect(e).toHaveProperty("name").toBe("Foo");
	});

	test("Change event", () => {
		let e = new ManagedChangeEvent("Change", new ManagedObject());
		expect(e).toHaveProperty("name").toBe("Change");
		expect(e.isChangeEvent()).toBeTruthy();
	});

	describe("Emitting events", () => {
		class TestObject extends ManagedObject {}

		test("Emit event", () => {
			expect(() => {
				new TestObject().emit("Testing");
			}).not.toThrowError();
		});

		test("Event listener functions", (t) => {
			let c = new TestObject();
			c.listen((event: any) => {
				try {
					expect(event).toBeInstanceOf(ManagedEvent);
					expect(event).toHaveProperty("name").toBe("Testing");
					t.count("event");
				} catch (err) {
					t.fail(err);
				}
			});
			c.emit("Testing");
			c.emit("Testing");
			t.expectCount("event").toBe(2);
		});

		test("Handle change events", (t) => {
			let c = new TestObject();
			c.listen((event: any) => {
				expect(event).toBeInstanceOf(ManagedChangeEvent);
				expect(event).toHaveProperty("name").toBe("Change");
				t.count("event");
			});
			c.emitChange();
			c.emitChange();
			t.expectCount("event").toBe(2);
		});

		test("Handle change events with name", (t) => {
			let c = new TestObject();
			c.listen((event: any) => {
				expect(event).toBeInstanceOf(ManagedChangeEvent);
				expect(event).toHaveProperty("name").toBe("Foo");
				t.count("event");
			});
			c.emitChange("Foo");
			c.emitChange("Foo");
			t.expectCount("event").toBe(2);
		});

		test("Error handling", (t) => {
			let caught = t.tryRun(() => {
				let c = new TestObject();
				c.listen(() => {
					t.count("event");

					// deliberately throw a string to test that too
					throw "Testing errors, ignore this one";
				});
				expect(() => {
					c.emit("Testing");
					c.emit("Testing");
				}).not.toThrowError();
			});
			t.expectCount("event").toBe(2);
			expect(caught)
				.asString()
				.toMatchRegExp(/Testing/);
		});
	});

	describe("Async iterator listeners", () => {
		test("Unlink cancels iterator", async (t) => {
			let c = new ManagedObject();
			let iter = c.listen()[Symbol.asyncIterator]();
			c.unlink();
			expect(await iter.next())
				.toHaveProperty("done")
				.toBe(true);
		});

		test("Unlink stops waiting iterator", async (t) => {
			let c = new ManagedObject();
			t.sleep(10).then(() => c.unlink());
			for await (let _event of c.listen()) {
				t.count("event");
			}
			t.expectCount("event").toBe(0);
		});

		test("Iterator handles events using buffer", async (t) => {
			let c = new ManagedObject();
			t.sleep(10).then(() => {
				c.emit("Foo");
				c.emit("Bar");
				c.emit("Baz");
			});
			let handled: string[] = [];
			for await (let event of c.listen()) {
				handled.push(event.name);
				if (handled.length >= 3) break;
			}
			expect(handled).toBeArray(["Foo", "Bar", "Baz"]);
		});

		test("Iterator handles events directly", async (t) => {
			let c = new ManagedObject();
			t.sleep(10).then(() => c.emit("Foo"));
			for await (let event of c.listen()) {
				if (event.name === "Foo") c.emit("Bar");
				if (event.name === "Bar") c.unlink();
			}
		});

		test("Iterator handles exceptions", async (t) => {
			let c = new ManagedObject();
			t.sleep(10).then(() => c.emit("Foo"));
			try {
				for await (let _event of c.listen()) {
					throw Error("Testing");
				}
			} catch (err) {
				t.count("error");
			}
			t.expectCount("error").toBe(1);
		});
	});

	test("GlobalEmitter", (t) => {
		type MyEvent = ManagedEvent<ManagedObject, { foo: string }, "Foo">;
		let emitter = new GlobalEmitter<MyEvent>();
		emitter.listen((e) => {
			if (e.name === "Foo") t.count(e.data.foo);
		});
		expect(emitter.isObserved()).toBeTruthy();
		emitter.emit("Foo", { foo: "foo" });
		t.expectCount("foo").toBe(1);
	});
});
