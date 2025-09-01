import { fmt } from "@talla-ui/util";
import { afterEach, beforeEach, expect, test } from "vitest";
import { bind, app, AppContext, ObservableObject } from "../../dist/index.js";

beforeEach(() => {
	AppContext.setErrorHandler((err) => {
		throw err;
	});
});
afterEach(() => {
	app.i18n.clear();
});

test("Set i18n provider with global context", () => {
	let word = "foo";
	app.i18n.configure("test", {
		getText: () => word,
	});
	expect(app.i18n.locale).toBe("test");
	expect(app.i18n.isRTL()).toBe(false);
	expect(fmt("abc").toString()).toBe("foo");
	word = "bar";
	expect(fmt("abc").toString()).toBe("bar");
	app.i18n.clear();
	expect(fmt("abc").toString()).toBe("abc");
});

test("Set translations with global context", () => {
	let abc = fmt("abc");
	expect(abc.toString()).toBe("abc");
	app.i18n.setTranslations({ abc: "def" });
	expect(abc.toString()).toBe("def");
});

test("Pluralization with global context", () => {
	app.i18n.configure("test");
	let plural = fmt("email{:+//s}", 1);
	expect(plural.toString()).toBe("email");
	plural = fmt("email{:+//s}", 2);
	expect(plural.toString()).toBe("emails");
	plural = fmt("email{:+//s}", 0);
	expect(plural.toString()).toBe("emails");
});

test("Locale format binding", () => {
	class MyParent extends ObservableObject {
		value = 123;
	}
	app.i18n.configure("test", {
		format(value: any, ...type: string[]) {
			return "{" + String(value) + ":" + type.join() + "}";
		},
	});
	let parent: any = new MyParent();
	parent.child = parent.attach(new ObservableObject());
	parent.child.observe(
		bind.fmt("{:Ltest/format}", bind("value")).asString(),
		(v: any) => (parent.child.value = v),
	);
	expect(parent.child).toHaveProperty("value", "{123:test,format}");
	app.i18n.clear();
});
