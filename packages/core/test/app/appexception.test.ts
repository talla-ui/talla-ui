import { useTestContext } from "@talla-ui/test-handler";
import { beforeEach } from "node:test";
import { afterEach, expect, test } from "vitest";
import { app, AppException } from "../../dist/index.js";
import { DeferredString } from "@talla-ui/util";

beforeEach(() => {
	useTestContext();
});
afterEach(() => {
	app.i18n.clear();
});

test("Can create a constructor", () => {
	let E = AppException.type("code", "message");
	expect(E).toBeTypeOf("function");
});

test("Error stack (AppException extends Error)", () => {
	let E = AppException.type("code", "message");
	function throwError() {
		throw new E();
	}
	try {
		throwError();
	} catch (e) {
		expect(e).toBeInstanceOf(E);
		if (e instanceof E) {
			let stack = e && e.stack;
			expect(stack).toBeTypeOf("string");
			expect(stack!.includes("throwError")).toBeTruthy();
		}
	}
});

test("Constructor with formatted string", () => {
	let E = AppException.type("code", "{}: {:i}");
	let e = new E("hello", 123);
	expect(e).toHaveProperty("message", "hello: 123");
});

test("Constructor with formatted string and cause", () => {
	let E = AppException.type("code", "{:i}");
	let e = new E(123, { cause: Error("foo") });
	expect(e).toHaveProperty("cause");
	expect(e.cause).toBeInstanceOf(Error);
});

test("Constructor with translated string", () => {
	class MyI18n implements DeferredString.I18nProvider {
		constructor(public word: string) {}
		isRTL = () => false;
		getAttributes = () => ({ locale: "test" });
		format = () => "";
		getPlural = () => "";
		getText(str: string) {
			if (str === "Foo: {}") return this.word + ": {}";
			return "";
		}
	}

	// Use i18n providers to translate messages;
	// note that only new instances are translated
	let E = AppException.type("code", "Foo: {}");
	app.i18n.configure("test", new MyI18n("Bar"));
	let e1 = new E("hello");
	expect(e1).toHaveProperty("message", "Bar: hello");
	app.i18n.configure("test", new MyI18n("Baz"));
	let e2 = new E("hello");
	expect(e1).toHaveProperty("message", "Bar: hello");
	expect(e2).toHaveProperty("message", "Baz: hello");
	app.i18n.clear();
	let e3 = new E("hello");
	expect(e1).toHaveProperty("message", "Bar: hello");
	expect(e2).toHaveProperty("message", "Baz: hello");
	expect(e3).toHaveProperty("message", "Foo: hello");
});
