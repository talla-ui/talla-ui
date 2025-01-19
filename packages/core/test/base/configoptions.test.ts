import { expect, test } from "vitest";
import { ConfigOptions } from "../../dist/index.js";

class MyOptions extends ConfigOptions {
	foo = "bar";
}

test("Initialize with undefined", () => {
	let result = MyOptions.init();
	expect(result).toBeInstanceOf(MyOptions);
	expect(result.foo).toBe("bar");
});

test("Initialize with instance", () => {
	let options = new MyOptions();
	expect(options.foo).toBe("bar");
	let result = MyOptions.init(options);
	expect(result).toBe(options);
});

test("Initialize with partial object", () => {
	let result = MyOptions.init({ foo: "baz" });
	expect(result).toBeInstanceOf(ConfigOptions);
	expect(result.foo).toBe("baz");
});

test("Initialize with function", () => {
	let result = MyOptions.init((options) => {
		options.foo = "baz";
	});
	expect(result).toBeInstanceOf(ConfigOptions);
	expect(result.foo).toBe("baz");
});
