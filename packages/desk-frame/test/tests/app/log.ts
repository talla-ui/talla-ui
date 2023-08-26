import { describe, expect, test } from "@desk-framework/test";
import { app, strf, AppException } from "../../../dist/index.js";

describe("LogWriter", (ctx) => {
	ctx.beforeEach(() => {
		app.clear();
	});

	test("Add log sink", () => {
		app.addLogHandler(0, (data) => {
			expect(data.severity).toBe(2);
			expect(data.message).toBe("Hello");
		});
		app.log.information("Hello");
	});

	test("Add log sink, min level", (t) => {
		let levels = [
			"Verbose",
			"Debug",
			"Information",
			"Warning",
			"Error",
			"Fatal",
		];
		app.addLogHandler(2, (data) => {
			t.count(levels[data.severity] || "Unknown");
		});
		app.log.verbose("Hello");
		app.log.debug("Hello");
		app.log.information("Hello");
		app.log.warning("Hello");
		app.log.error("Hello");
		app.log.fatal("Hello");
		t.expectCount("Verbose").toBe(0);
		t.expectCount("Debug").toBe(0);
		t.expectCount("Information").toBe(1);
		t.expectCount("Warning").toBe(1);
		t.expectCount("Error").toBe(1);
		t.expectCount("Fatal").toBe(1);
	});

	test("Write message using strf", () => {
		app.addLogHandler(0, (data) => {
			expect(data.message).toBe("Hello, world!");
			expect(data.data).toBeArray(["world"]);
		});
		app.log.information(strf("Hello, %s!", "world"));
	});

	test("Write message using strf, named property", () => {
		app.addLogHandler(0, (data) => {
			expect(data.message).toBe("Hello, world!");
			expect(data.data).toBeArray(1);
			expect(data.data[0]).toHaveProperty("who").toBe("world");
		});
		app.log.information(strf("Hello, %[who]!", { who: "world" }));
	});

	test("Write plain error", () => {
		app.addLogHandler(0, (data) => {
			expect(data.message).toBe("Hello");
			expect(data.data[0]).toHaveProperty("error").toBeTruthy();
			expect(data.data[0]).toHaveProperty("stack").toBeTypeOf("string");
		});
		app.log.error(Error("Hello"));
	});

	test("Write AppException", () => {
		const MyError = AppException.type("MyError", "Hello, %[who]!");
		app.addLogHandler(0, (data) => {
			expect(data.message).toBe("Hello, world!");
			expect(data.data[0]).toHaveProperty("who").toBe("world");
			expect(data.data[1]).toHaveProperty("error").toBeTruthy();
			expect(data.data[1]).toHaveProperty("stack").toBeTypeOf("string");
		});
		app.log.error(new MyError({ who: "world" }));
	});

	test("Write AppException with cause", () => {
		const MyError = AppException.type("MyError", "Hello, %[who]!");
		app.addLogHandler(0, (data) => {
			expect(data.data[2]).toHaveProperty("cause").toMatchRegExp(/Hello/);
		});
		app.log.error(new MyError({ who: "world" }, { cause: Error("Hello") }));
	});
});
