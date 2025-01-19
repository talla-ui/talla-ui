import { useTestContext } from "@talla-ui/test-handler";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
	Activity,
	app,
	AppContext,
	ManagedObject,
	NavigationContext,
} from "../../dist/index.js";

describe("NavigationContext standalone", () => {
	let p: NavigationContext;
	beforeEach(() => {
		p = new NavigationContext();
	});
	afterEach(() => {
		p.unlink();
	});

	test("Set, get page ID", () => {
		p.set("foo");
		expect(p.pageId).toBe("foo");
		p.unlink();
	});

	test("Set, get page ID and detail", () => {
		p.set("foo", "bar");
		expect(p.pageId).toBe("foo");
		expect(p.detail).toBe("bar");
		p.unlink();
	});

	test("Set, get path undefined", () => {
		p.set(undefined as any);
		expect(p.pageId).toBe("");
		expect(p.detail).toBe("");
		p.unlink();
	});

	test("Set invalid path", () => {
		expect(() => p.set("foo/bar")).toThrowError();
		expect(() => p.set(".foo")).toThrowError();
		p.unlink();
	});
});

describe("ActivityList and activities", () => {
	beforeEach(() => {
		useTestContext({ navigationDelay: 0 });
	});

	function goTo(pageId: string, detail?: string) {
		app.navigation.set(pageId, detail);
	}

	test("Activity context Object and properties", () => {
		expect(ManagedObject.whence(app.activities)).toBe(app);
		expect(app.activities.getActivities()).toEqual([]);
		expect(app.activities.count).toBe(0);
		expect(app.navigation).toBeInstanceOf(NavigationContext);
	});

	test("Activity activated when added", async () => {
		let activity = new Activity();
		activity.navigationPageId = "foo";
		goTo("foo");
		app.addActivity(activity);
		expect(app.activities.count).toBe(1);
		await new Promise((r) => setTimeout(r, 1));
		expect(activity.isActive()).toBeTruthy();
		expect(app.navigation.matchedPageId).toBe("foo");
		expect(app.activities.activated).toBe(activity);
	});

	test("Activity not activated when added", async () => {
		let activityFoo = new Activity();
		activityFoo.navigationPageId = "foo";
		let activityBar = new Activity();
		activityBar.navigationPageId = "bar";
		goTo("bar");
		app.addActivity(activityFoo);
		app.addActivity(activityBar);
		await new Promise((r) => setTimeout(r, 1));
		expect(activityFoo.isActive()).toBeFalsy();
		expect(activityBar.isActive()).toBeTruthy();
		for (let a of app.activities) {
			if ((a.navigationPageId === app.navigation.pageId) !== a.isActive()) {
				throw Error("Activation state != page ID match");
			}
		}
	});

	test("Activity activated when app path changed (async)", async () => {
		let activity = new Activity();
		activity.navigationPageId = "foo";
		goTo("bar");
		app.addActivity(activity);
		await new Promise((r) => setTimeout(r, 1));
		expect(activity.isActive()).toBeFalsy();
		goTo("foo");
		await new Promise((r) => setTimeout(r, 1));
		expect(activity.isActive()).toBeTruthy();
	});

	test("Activity activated based on path", async () => {
		let active = 0;
		let inactive = 0;
		class MyActivity extends Activity {
			override navigationPageId = "foo";
			protected override async beforeActiveAsync() {
				active++;
			}
			protected override async beforeInactiveAsync() {
				inactive++;
			}
		}
		let activity = new MyActivity();
		app.addActivity(activity);
		goTo("foo");
		await new Promise((r) => setTimeout(r, 1));
		expect(active).toBe(1);
		goTo("bar");
		await new Promise((r) => setTimeout(r, 1));
		expect(active).toBe(1);
		expect(inactive).toBe(1);
	});

	test("Detail handler called (async)", async () => {
		let handler = 0;
		let details: string[] = [];
		class MyActivity extends Activity {
			override navigationPageId = "foo";
			override async handleNavigationDetailAsync(
				detail: string,
				navigationPath: NavigationContext,
			) {
				handler++;
				console.log("Detail: ", detail);
				details.push(detail);
				if (navigationPath !== app.navigation)
					throw Error("Invalid navigation path");
			}
		}
		let activity = new MyActivity();
		goTo("foo");
		app.addActivity(activity);
		await new Promise((r) => setTimeout(r, 1));
		expect(handler).toBe(1);
		goTo("foo", "bar");
		await new Promise((r) => setTimeout(r, 1));
		expect(handler).toBe(2);
		goTo("foo", "bar/baz");
		await new Promise((r) => setTimeout(r, 1));
		goTo("foo");
		await new Promise((r) => setTimeout(r, 1));
		expect(handler).toBe(4);
		expect(details).toEqual(["", "bar", "bar/baz", ""]);
	});

	test("Quick path changes", async () => {
		let errored = 0;
		AppContext.setErrorHandler((err) => {
			errored++;
			expect(String(err)).toMatch(/cancelled/);
		});

		let active = 0;
		let inactive = 0;
		class MyActivity extends Activity {
			override navigationPageId = "foo";
			protected override async beforeActiveAsync() {
				await new Promise((r) => setTimeout(r, 20));
				active++;
			}
			protected override async beforeInactiveAsync() {
				await new Promise((r) => setTimeout(r, 20));
				inactive++;
			}
		}

		// test synchronous changes:
		let activity = new MyActivity();
		app.addActivity(activity);
		console.log("Setting path synchronously: foo");
		goTo("foo");
		console.log("Setting path synchronously: bar");
		goTo("bar");
		console.log("Setting path synchronously: foo");
		goTo("foo");
		console.log("Waiting...");
		await new Promise((r) => setTimeout(r, 50));
		expect(active).toBe(1);
		expect(inactive).toBe(0);

		// test cancellation:
		console.log("Setting path asynchronously: bar");
		goTo("bar");
		await new Promise((r) => setTimeout(r, 1)); // inactivate
		console.log("Setting path asynchronously: foo");
		goTo("foo");
		await new Promise((r) => setTimeout(r, 1)); // activate, cancelled!
		console.log("Setting path asynchronously: bar");
		goTo("bar");
		await new Promise((r) => setTimeout(r, 20)); // inactivate, skipped
		expect(active).toBe(1);
		await new Promise((r) => setTimeout(r, 50));
		expect(inactive).toBe(1);
		expect(errored).toBe(1);
	});
});
