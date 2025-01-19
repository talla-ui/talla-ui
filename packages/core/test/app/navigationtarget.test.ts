import { expect, test } from "vitest";
import { Activity, NavigationTarget } from "../../dist/index.js";

test("Constructor with plain page ID", () => {
	let t = new NavigationTarget("foo");
	expect(t).toEqual({ pageId: "foo", detail: "" });
});

test("Constructor with multiple arguments", () => {
	let t = new NavigationTarget("foo", "bar", "Foo");
	expect(t).toEqual({ pageId: "foo", detail: "bar", title: "Foo" });
});

test("Constructor with all properties", () => {
	let t = new NavigationTarget({
		pageId: "foo",
		detail: "bar",
		title: "Foo",
	});
	expect(t).toEqual({ pageId: "foo", detail: "bar", title: "Foo" });
});

test("Constructor with string path", () => {
	let t = new NavigationTarget("foo/bar/baz");
	expect(t).toEqual({ pageId: "foo", detail: "bar/baz" });
	expect(() => new NavigationTarget("./foo")).toThrowError();
});

test("Constructor with activity", () => {
	let activity = new Activity();
	activity.navigationPageId = "foo";
	activity.title = "Foo";
	let t = new NavigationTarget(activity);
	expect(t).toEqual({ pageId: "foo", detail: "", title: "Foo" });
});
