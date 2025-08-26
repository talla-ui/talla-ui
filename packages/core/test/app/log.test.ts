import { fmt } from "@talla-ui/util";
import { beforeEach, expect, test } from "vitest";
import { app, AppContext, AppException } from "../../dist/index.js";

beforeEach(() => {
	app.clear();
	AppContext.setErrorHandler((err) => {
		throw err;
	});
});

test("Add log sink", () => {
	app.log.addHandler(0, (data) => {
		expect(data.level).toBe(2);
		expect(data.message).toBe("Hello");
	});
	app.log.information("Hello");
});

test("Add log sink, min level", () => {
	let seen: number[] = [];
	app.log.addHandler(2, (data) => {
		seen.push(data.level);
	});
	app.log.verbose("Hello");
	app.log.debug("Hello");
	app.log.information("Hello");
	app.log.warning("Hello");
	app.log.error("Hello");
	app.log.fatal("Hello");
	expect(seen).toEqual([2, 3, 4, 5]);
});

test("Write message using fmt", () => {
	app.log.addHandler(0, (data) => {
		expect(data.message).toBe("Hello, world!");
		expect(data.data).toEqual(["world"]);
	});
	app.log.information(fmt("Hello, {}!", "world"));
});

test("Write message using multiple args", () => {
	app.log.addHandler(0, (data) => {
		expect(data.message).toBe("Hello");
		expect(data.data).toEqual(["world"]);
	});
	app.log.information("Hello", "world");
});

test("Dump data using multiple args", () => {
	let a = { a: 1 };
	let b = { b: 2 };
	app.log.addHandler(0, (data) => {
		expect(data.data).toEqual([a, b]);
	});
	app.log.dump(a, b);
});

test("Write message using fmt, named property", () => {
	app.log.addHandler(0, (data) => {
		expect(data.message).toBe("Hello, world!");
		expect(data.data).toHaveLength(1);
		expect(data.data[0]).toHaveProperty("who", "world");
	});
	app.log.information(fmt("Hello, {who}!", { who: "world" }));
});

test("Write plain error", () => {
	app.log.addHandler(0, (data) => {
		expect(data.message).toBe("Hello");
		expect(data.data[0].error).toBeTruthy();
		expect(data.data[0].stack).toBeTypeOf("string");
	});
	app.log.error(Error("Hello"));
});

test("Write AppException", () => {
	const MyError = AppException.type("MyError", "Hello, {who}!");
	app.log.addHandler(0, (data) => {
		expect(data.message).toBe("Hello, world!");
		expect(data.data[0]).toHaveProperty("who", "world");
		expect(data.data[1].error).toBeTruthy();
		expect(data.data[1].stack).toBeTypeOf("string");
	});
	app.log.error(new MyError({ who: "world" }));
});

test("Write AppException with cause", () => {
	const MyError = AppException.type("MyError", "Hello, {who}!");
	app.log.addHandler(0, (data) => {
		expect(data.data[2].cause).toMatch(/Hello/);
	});
	app.log.error(new MyError({ who: "world" }, { cause: Error("Hello") }));
});
