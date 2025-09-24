import { expectOutputAsync, useTestContext } from "@talla-ui/test-handler";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { ActivityRouter } from "../../dist/app/ActivityRouter.js";
import {
	Activity,
	app,
	Binding,
	NavigationContext,
	ObservableObject,
	UI,
} from "../../dist/index.js";

describe("NavigationContext standalone", () => {
	class TestNavigationContext extends NavigationContext {
		override async navigateAsync(): Promise<void> {
			// nothing here
		}
	}
	let p: TestNavigationContext;
	beforeEach(() => {
		p = new TestNavigationContext();
	});
	afterEach(() => {
		p.unlink();
	});

	test("Set, get path", () => {
		p.set("foo");
		expect(p.path).toBe("foo");
		p.unlink();
	});

	test("Set, get path undefined", () => {
		p.set(undefined as any);
		expect(p.path).toBe("");
		p.unlink();
	});

	test("Set invalid path", () => {
		expect(() => p.set("foo/bar/")).toThrowError();
		expect(() => p.set("/foo")).toThrowError();
		expect(() => p.set(".foo")).toThrowError();
		p.unlink();
	});
});

describe("AppContext.activities", () => {
	beforeEach(() => {
		useTestContext({ navigationDelay: 0 });
	});

	test("App context properties", () => {
		expect(ObservableObject.whence(app.activities)).toBe(app);
		expect(app.activities.toArray()).toEqual([]);
		expect(app.navigation).toBeInstanceOf(NavigationContext);
	});

	test("Activity activated when added", async () => {
		let activity = new Activity();
		activity.navigationPath = "foo";
		app.navigation?.set("foo");
		app.addActivity(activity);
		expect(app.activities.toArray().length).toBe(1);
		await new Promise((r) => setTimeout(r, 10));
		expect(activity.isActive()).toBeTruthy();
		expect(app.navigation?.matchedPath).toBe("foo");
		expect(activity.isActive()).toBe(true);
		expect(app.activities.active).toBe(activity);
	});

	test("Activity router emits changes", async () => {
		let updated = 0;
		let activity = new Activity();
		activity.navigationPath = "foo";
		activity.observe(new Binding("appContext.activities"), () => {
			updated++;
		});
		app.addActivity(activity);
		expect(updated).toBe(2); // once for attaching, once for change
		app.addActivity(new Activity());
		expect(updated).toBe(3); // once for adding another activity
		app.navigation?.set("foo");
		await new Promise((r) => setTimeout(r, 10));
		expect(updated).toBe(4); // once for activation
		app.navigation?.set("");
		await new Promise((r) => setTimeout(r, 10));
		expect(activity.isActive()).toBe(false);
		expect(updated).toBe(5); // once for deactivation
	});

	test("Activity not activated when added", async () => {
		let activityFoo = new Activity();
		activityFoo.navigationPath = "foo";
		let activityBar = new Activity();
		activityBar.navigationPath = "bar";
		app.navigation?.set("bar");
		app.addActivity(activityFoo);
		app.addActivity(activityBar);
		await new Promise((r) => setTimeout(r, 10));
		expect(activityFoo.isActive()).toBeFalsy();
		expect(activityBar.isActive()).toBeTruthy();
		for (let a of app.activities.toArray()) {
			if ((a.navigationPath === app.navigation?.path) !== a.isActive()) {
				throw Error("Activation state != page ID match");
			}
		}
	});

	test("Activity activated when app path matches (async)", async () => {
		let activity = new Activity();
		activity.navigationPath = "foo";
		app.navigation?.set("bar");
		app.addActivity(activity);
		await new Promise((r) => setTimeout(r, 10));
		expect(activity.isActive()).toBeFalsy();
		app.navigation?.set("foo");
		await new Promise((r) => setTimeout(r, 10));
		expect(activity.isActive()).toBeTruthy();
	});

	test("Activity activated based on exact path", async () => {
		let active = 0;
		let inactive = 0;
		class MyActivity extends Activity {
			override navigationPath = "foo";
			protected override async beforeActiveAsync() {
				active++;
			}
			protected override async beforeInactiveAsync() {
				inactive++;
			}
		}
		let activity = new MyActivity();
		app.addActivity(activity);
		app.navigation?.set("foo");
		await new Promise((r) => setTimeout(r, 10));
		expect(active).toBe(1);
		app.navigation?.set("bar");
		await new Promise((r) => setTimeout(r, 10));
		app.navigation?.set("foo/bar");
		await new Promise((r) => setTimeout(r, 10));
		expect(active).toBe(1);
		expect(inactive).toBe(1);
	});

	test("Activity activated with custom match", async () => {
		let active = 0;
		let inactive = 0;
		let called = 0;
		class MyActivity extends Activity {
			override matchNavigationPath(path: string) {
				if (path === "foo" || path.startsWith("foo/")) {
					return () => {
						called++;
					};
				}
			}
			protected override async beforeActiveAsync() {
				active++;
			}
			protected override async beforeInactiveAsync() {
				inactive++;
			}
		}
		let activity = new MyActivity();
		app.addActivity(activity);
		app.navigation?.set("foo");
		await new Promise((r) => setTimeout(r, 10));
		expect(active).toBe(1);
		app.navigation?.set("bar");
		await new Promise((r) => setTimeout(r, 10));
		app.navigation?.set("foo/bar");
		await new Promise((r) => setTimeout(r, 10));
		expect(active).toBe(2);
		expect(called).toBe(2);
		expect(inactive).toBe(1);
	});

	test("Quick path changes", async () => {
		let active = 0;
		let inactive = 0;
		class MyFooActivity extends Activity {
			override navigationPath = "foo";
			protected override async beforeActiveAsync() {
				console.log("foo: beforeActiveAsync [...");
				await new Promise((r) => setTimeout(r, 20));
				active++;
				console.log("...] foo: beforeActiveAsync", active);
			}
			protected override async beforeInactiveAsync() {
				console.log("foo: beforeInactiveAsync [...");
				await new Promise((r) => setTimeout(r, 20));
				inactive++;
				console.log("...] foo: beforeInactiveAsync", inactive);
			}
		}
		class MyBarActivity extends Activity {
			override navigationPath = "bar";
		}

		// test synchronous changes:
		let activity = new MyFooActivity();
		app.addActivity(activity);
		app.addActivity(new MyBarActivity());
		console.log("Setting path synchronously: foo");
		app.navigation?.set("foo");
		console.log("Setting path synchronously: bar");
		app.navigation?.set("bar");
		console.log("Setting path synchronously: foo");
		app.navigation?.set("foo");
		console.log("Waiting...");
		await new Promise((r) => setTimeout(r, 100));
		expect(active).toBe(1);
		expect(inactive).toBe(0);

		// test async
		console.log("Setting path asynchronously: bar");
		app.navigation?.set("bar");
		await new Promise((r) => setTimeout(r, 5)); // inactivate
		console.log("Setting path asynchronously: foo");
		app.navigation?.set("foo");
		await new Promise((r) => setTimeout(r, 5)); // activate, stopped
		console.log("Setting path asynchronously: bar");
		app.navigation?.set("bar");
		await new Promise((r) => setTimeout(r, 50)); // inactivate, skipped because already inactive
		console.log("Setting path asynchronously: foo");
		app.navigation?.set("foo");
		await new Promise((r) => setTimeout(r, 50)); // activate, should go through again
		expect(active).toBe(2);
		expect(inactive).toBe(1);
	});
});

describe("Nested activity router", () => {
	beforeEach(() => {
		useTestContext({ navigationDelay: 0 });
	});

	class MyActivity extends Activity {
		static override View(v: Binding<MyActivity>) {
			return UI.Text(v.bind("text"));
		}
		constructor(public text: string) {
			super();
		}
		router = this.attach(new ActivityRouter());
	}

	test("Add nested activity", async () => {
		let activity = new MyActivity("root");
		let nested = new MyActivity("nested");
		activity.router.add(nested);
		app.addActivity(activity);
		expect(activity.router.toArray()).toEqual([nested]);
		expect(MyActivity.whence(nested)).toBe(activity);
	});

	test("Activate nested activity", async () => {
		let activity = new MyActivity("root");
		app.addActivity(activity, true);
		let nested = new MyActivity("nested");
		activity.router.add(nested, true);
		await expectOutputAsync({ text: "root" });
		await expectOutputAsync({ text: "nested" });
	});

	test("Deactivate at same time", async () => {
		let activity = new MyActivity("root");
		let nested1 = new MyActivity("nested1");
		let nested2 = new MyActivity("nested2");
		app.addActivity(activity, true);
		activity.router.add(nested1, true);
		activity.router.add(nested2, true);
		await expect
			.poll(
				() => activity.isActive() && nested1.isActive() && nested2.isActive(),
				{
					interval: 5,
					timeout: 100,
				},
			)
			.toBe(true);
		await activity.deactivateAsync();
		await expect
			.poll(() => nested1.isActive() || nested2.isActive(), {
				interval: 5,
				timeout: 100,
			})
			.toBe(false);
	});

	test("Replace unlinks other activity", async () => {
		let activity = new MyActivity("root");
		let nested1 = new MyActivity("nested1");
		let nested2 = new MyActivity("nested2");
		app.addActivity(activity);
		await activity.activateAsync();
		activity.router.add(nested1, true);
		for await (let e of nested1.listenAsync()) {
			if (e.name === "Active") break;
		}
		activity.router.replace(nested2);
		expect(nested1.isUnlinked()).toBe(true);
	});
});
