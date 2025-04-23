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
	let e = new ObservedEvent("Foo", new ObservedObject());
	expect(e).toHaveProperty("name", "Foo");
});

test("Change event", () => {
	let o = new ObservedObject();
	let e = new ObservedEvent("Change", o, { change: o });
	expect(e).toHaveProperty("name", "Change");
	expect(e).toHaveProperty("source", o);
	expect(e.data).toHaveProperty("change", o);
});

describe("Emitting events", () => {
	class TestObject extends ObservedObject {}

	test("Emit event", () => {
		expect(() => {
			new TestObject().emit("Testing");
		}).not.toThrowError();
	});

	test("Event listener functions", () => {
		let count = 0;
		let c = new TestObject();
		c.listen((event: any) => {
			try {
				expect(event).toBeInstanceOf(ObservedEvent);
				expect(event).toHaveProperty("name", "Testing");
				count++;
			} catch (err) {
				expect.fail(String(err));
			}
		});
		c.emit("Testing");
		c.emit("Testing");
		expect(count).toBe(2);
	});

	test("Event intercept", () => {
		let count = 0;
		let c = new TestObject();
		ObservedObject.intercept(c, "Testing", (event, emit) => {
			try {
				count++;
				expect(event).toBeInstanceOf(ObservedEvent);
				let newEvent = new ObservedEvent("Intercepted", c);
				emit(newEvent);
			} catch (err) {
				expect.fail(String(err));
			}
		});
		c.listen((event: any) => {
			try {
				expect(event).toBeInstanceOf(ObservedEvent);
				expect(event).toHaveProperty("name", "Intercepted");
			} catch (err) {
				expect.fail(String(err));
			}
		});
		c.emit("Testing");
		c.emit("Testing");
		expect(count).toBe(2);
	});

	test("Intercept accepts only one handler", () => {
		let c = new TestObject();
		let handled = 0;
		ObservedObject.intercept(c, "Testing", (event, emit) => {
			handled = 1;
			emit(event);
		});
		ObservedObject.intercept(c, "Testing", (event, emit) => {
			handled = 2;
			emit(event);
		});
		c.emit("Testing");
		expect(handled).toBe(1);
	});

	test("Error handling", () => {
		let count = 0;
		let c = new TestObject();
		expect(numErrors).toBe(0);
		expect(pendingError).toBeUndefined();
		c.listen(() => {
			count++;

			// deliberately throw a string to test that too
			throw "Testing errors, ignore this one";
		});
		expect(() => {
			c.emit("Testing");
			c.emit("Testing");
		}).not.toThrowError();
		expect(String(pendingError)).match(/Testing/);
		pendingError = undefined;
		expect(count).toBe(2);
	});

	test("After error handling", () => {
		expect(numErrors).toBe(0);
		expect(pendingError).toBeUndefined();
	});
});

describe("Async iterator listeners", () => {
	test("Unlink cancels iterator", async () => {
		let c = new ObservedObject();
		let iter = c.listen(true)[Symbol.asyncIterator]();
		c.unlink();
		expect(await iter.next()).toHaveProperty("done", true);
	});

	test("Unlink stops waiting iterator", async () => {
		let c = new ObservedObject();
		let events = 0;
		new Promise((r) => setTimeout(r, 10)).then(() => c.unlink());
		for await (let _ of c.listen(true)) {
			events++;
		}
		expect(events).toBe(0);
	});

	test("Iterator handles events using buffer", async () => {
		let c = new ObservedObject();
		new Promise((r) => setTimeout(r, 10)).then(() => {
			c.emit("Foo");
			c.emit("Bar");
			c.emit("Baz");
		});
		let handled: string[] = [];
		for await (let event of c.listen(true)) {
			handled.push(event.name);
			if (handled.length >= 3) break;
		}
		expect(handled).toEqual(["Foo", "Bar", "Baz"]);
	});

	test("Iterator handles events directly", async () => {
		let c = new ObservedObject();
		new Promise((r) => setTimeout(r, 10)).then(() => c.emit("Foo"));
		for await (let event of c.listen(true)) {
			if (event.name === "Foo") c.emit("Bar");
			if (event.name === "Bar") c.unlink();
		}
	});

	test("Iterator handles exceptions", async () => {
		let c = new ObservedObject();
		let errors = 0;
		new Promise((r) => setTimeout(r, 10)).then(() => c.emit("Foo"));
		try {
			for await (let _event of c.listen(true)) {
				throw Error("Testing");
			}
		} catch (err) {
			errors++;
		}
		expect(errors).toBe(1);
	});
});
