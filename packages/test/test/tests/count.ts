import { describe, test } from "../../dist/index.js";
// ... from "@desk-framework/test"

describe("Counters", () => {
	test("Count to 3", (t) => {
		t.count("foo");
		t.count("foo");
		t.count("foo");
		t.expectCount("foo").toBe(3);
	});

	test("Count up and down", (t) => {
		t.count("foo", 3);
		t.count("foo", -1);
		t.expectCount("foo").toBeLessThan(3);
		t.count("foo", 2);
		t.expectCount("foo").toBe(3 - 1 + 2);
	});
});
