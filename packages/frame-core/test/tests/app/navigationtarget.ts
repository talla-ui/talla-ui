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

	test("Set captures", () => {
		let t = new NavigationTarget("foo/:bar/:baz").setCapture({
			bar: "1",
			baz: "2",
		});
		expect(t.toString()).toBe("foo/1/2");
	});

	test("Set capture at start", () => {
		let t = new NavigationTarget(":foo/bar").setCapture({ foo: "1" });
		expect(t.toString()).toBe("1/bar");
	});

	test("Set rest", () => {
		let t = new NavigationTarget("foo/bar/*baz").setCapture(undefined, "123");
		expect(t.toString()).toBe("foo/bar/123");
	});

	test("Set rest at start", () => {
		let t = new NavigationTarget("*foo").setCapture(undefined, "123");
		expect(t.toString()).toBe("123");
	});

	test("Set captures and rest", () => {
		let t = new NavigationTarget("foo/:bar/*baz").setCapture(
			{ bar: "1" },
			"123",
		);
		expect(t.toString()).toBe("foo/1/123");
	});

	test("Constructor with activity", () => {
		let activity = new Activity();
		activity.path = "foo";
		let t = new NavigationTarget(activity);
		expect(t.toString()).toBe("foo");
	});

	test("Constructor with activity and title", () => {
		let activity = new Activity();
		activity.path = "foo";
		let t = new NavigationTarget(activity, "Foo");
		expect(t.title).toBe("Foo");
		activity.title = "Foo";
		let u = new NavigationTarget(activity);
		expect(u.title).toBe("Foo");
	});

	test("Constructor with activity and captures", () => {
		let activity = new Activity();
		activity.path = "foo/:bar";
		let t = new NavigationTarget(activity).setCapture({ bar: "123" });
		expect(t.toString()).toBe("foo/123");
	});

	test("Constructor with nested activity", () => {
		class MyActivity extends Activity {
			constructor() {
				super();
				this.observeAttach("nested");
			}
			nested?: MyActivity;
		}
		let activity = new MyActivity();
		activity.path = "foo";
		activity.nested = new MyActivity();
		activity.nested.path = "./bar";
		let t = new NavigationTarget(activity.nested);
		expect(t.toString()).toBe("foo/bar");
	});
});
