import { I18nProvider, LazyString, strf } from "@talla-ui/util";
import { afterEach, beforeEach, expect, test } from "vitest";
import { $bind, app, AppContext, ObservedObject } from "../../dist/index.js";

beforeEach(() => {
	expect(app.i18n).toBeUndefined();
	AppContext.setErrorHandler((err) => {
		throw err;
	});
});
afterEach(() => {
	expect(app.i18n).toBeUndefined();
	LazyString.setI18nInterface();
});

class BaseI18nProvider implements I18nProvider {
	getAttributes(): Readonly<I18nProvider.Attributes> {
		return { locale: "test" };
	}
	getText(_text: string): string {
		throw new Error("Method not implemented.");
	}
	getPlural(_value: number, _forms: string[]): string {
		throw new Error("Method not implemented.");
	}
	format(_value: any, ..._types: any[]): string {
		throw new Error("Method not implemented.");
	}
}

test("Set i18n provider with global context", () => {
	class MyI18nProvider extends BaseI18nProvider {
		constructor(private _s: string) {
			super();
		}
		override getText() {
			return this._s;
		}
	}
	let i18n = new MyI18nProvider("foo");
	app.i18n = i18n as any;
	expect(strf("abc").toString()).toBe("foo");
	i18n = new MyI18nProvider("bar");
	app.i18n = i18n as any;
	expect(strf("abc").toString()).toBe("bar");
	app.i18n = undefined;
	expect(strf("abc").toString()).toBe("abc");
});

test("Local format binding", () => {
	class MyI18nProvider extends BaseI18nProvider {
		override getText = (s: string) => s;
		override format(value: any, ...type: string[]) {
			return "{" + String(value) + ":" + type.join() + "}";
		}
	}
	app.i18n = new MyI18nProvider();
	let parent: any = new ObservedObject();
	parent.value = 123;
	parent.child = parent.attach(new ObservedObject());
	$bind("value").local("test", "format").bindTo(parent.child, "value");
	expect(parent.child).toHaveProperty("value", "{123:test,format}");
	app.i18n = undefined;
});
