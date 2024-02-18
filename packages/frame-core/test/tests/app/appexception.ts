import {
	AppException,
	I18nProvider,
	app,
	ManagedObject,
} from "../../../dist/index.js";
import { describe, expect, test } from "@desk-framework/frame-test";

describe("AppException", (scope) => {
	scope.afterEach(() => {
		expect(app.i18n).toBeUndefined();
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
		let E = AppException.type("code", "%s: %i");
		let e = new E("hello", 123);
		expect(e).toHaveProperty("message").toBe("hello: 123");
	});

	test("Constructor with formatted string and cause", () => {
		let E = AppException.type("code", "%i");
		let e = new E(123, { cause: Error("foo") });
		expect(e).toHaveProperty("cause").toBeInstanceOf(Error);
	});

	test("Constructor with translated string", () => {
		class MyI18n extends ManagedObject implements I18nProvider {
			constructor(public word: string) {
				super();
			}
			getAttributes = () => ({ locale: "test" });
			format = () => "";
			getPlural = () => "";
			getText(str: string) {
				if (str === "Foo: %s") return this.word + ": %s";
				return "";
			}
		}

		// Use i18n providers to translate messages;
		// note that only new instances are translated
		let E = AppException.type("code", "Foo: %s");
		app.i18n = new MyI18n("Bar");
		let e1 = new E("hello");
		expect(e1).toHaveProperty("message").toBe("Bar: hello");
		app.i18n = new MyI18n("Baz");
		let e2 = new E("hello");
		expect(e1).toHaveProperty("message").toBe("Bar: hello");
		expect(e2).toHaveProperty("message").toBe("Baz: hello");
		app.i18n = undefined;
		let e3 = new E("hello");
		expect(e1).toHaveProperty("message").toBe("Bar: hello");
		expect(e2).toHaveProperty("message").toBe("Baz: hello");
		expect(e3).toHaveProperty("message").toBe("Foo: hello");
	});
});
