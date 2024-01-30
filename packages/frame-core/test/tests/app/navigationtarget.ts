import { describe, expect, test } from "@desk-framework/frame-test";
import { Activity, NavigationTarget } from "../../../dist/index.js";

describe("NavigationTarget", () => {
	test("Constructor with plain path", () => {
		let t = new NavigationTarget("foo");
		expect(t.toString()).toBe("foo");
	});

	test("Constructor with plain path and title", () => {
		let t = new NavigationTarget("foo", "Foo");
		expect(t.toString()).toBe("foo");
		expect(t.title).toBe("Foo");
	});

	test("Constructor with toString path", () => {
		let t = new NavigationTarget({ toString: () => "foo" });
		expect(t.toString()).toBe("foo");
	});

	test("Append detail", () => {
		let t = new NavigationTarget("foo").append("bar", "baz");
		expect(t.toString()).toBe("foo/bar/baz");
	});

	test("Constructor with activity", () => {
		let activity = new Activity();
		activity.navigationPageId = "foo";
		let t = new NavigationTarget(activity);
		expect(t.toString()).toBe("foo");
	});

	test("Constructor with activity and title", () => {
		let activity = new Activity();
		activity.navigationPageId = "foo";
		let t = new NavigationTarget(activity, "Foo");
		expect(t.title).toBe("Foo");
		activity.title = "Foo";
		let u = new NavigationTarget(activity);
		expect(u.title).toBe("Foo");
	});

	test("Constructor with activity and detail", () => {
		let activity = new Activity();
		activity.navigationPageId = "foo";
		let t = new NavigationTarget(activity).append("bar");
		expect(t.toString()).toBe("foo/bar");
	});
});
