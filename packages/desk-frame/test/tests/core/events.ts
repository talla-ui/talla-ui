import {
	GlobalEmitter,
	ManagedChangeEvent,
	ManagedEvent,
	ManagedObject,
} from "../../../dist/index.js";
import { describe, expect, test } from "@desk-framework/test";

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
