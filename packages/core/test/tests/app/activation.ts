import {
	app,
	NavigationContext,
	Activity,
	ManagedObject,
} from "../../../dist/index.js";
import { describe, expect, test, useTestContext } from "@talla-ui/test-handler";

describe("NavigationContext and ActivityContext", () => {
	describe("NavigationContext standalone", (scope) => {
		let p: NavigationContext;
		scope.beforeEach((t) => {
			t.breakOnFail();
			p = new NavigationContext();
		});
		scope.afterEach(() => {
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

	describe("ActivityContext and activities", (scope) => {
		scope.beforeEach(() => {
			useTestContext({ navigationDelay: 0 });
		});

		function goTo(pageId: string, detail?: string) {
			app.navigation.set(pageId, detail);
		}

		test("Activity context Object and properties", (t) => {
			expect(ManagedObject.whence(app.activities)).toBe(app);
			expect(app.activities.getAll()).toBeArray(0);
			expect(app.activities.getActive()).toBeArray(0);
			expect(app.navigation).toBeInstanceOf(NavigationContext);
		});

		test("Activity activated when added", async (t) => {
			let activity = new Activity();
			activity.navigationPageId = "foo";
			goTo("foo");
			app.addActivity(activity);
			await t.sleep(1);
			expect(activity.isActive()).toBeTruthy();
			expect(app.navigation.matchedPageId).toBe("foo");
		});

		test("Activity activated when app path changed (async)", async (t) => {
			let activity = new Activity();
			activity.navigationPageId = "foo";
			goTo("bar");
			app.addActivity(activity);
			await t.sleep(1);
			expect(activity.isActive()).toBeFalsy();
			goTo("foo");
			await t.sleep(1);
			expect(activity.isActive()).toBeTruthy();
		});

		test("Activity activated based on path", async (t) => {
			class MyActivity extends Activity {
				override navigationPageId = "foo";
				protected override async beforeActiveAsync() {
					t.count("active");
				}
				protected override async beforeInactiveAsync() {
					t.count("inactive");
				}
			}
			let activity = new MyActivity();
			app.addActivity(activity);
			goTo("foo");
			await t.sleep(1);
			t.expectCount("active").toBe(1);
			goTo("bar");
			await t.sleep(1);
			t.expectCount("active").toBe(1);
			t.expectCount("inactive").toBe(1);
		});

		test("Detail handler called (async)", async (t) => {
			let details: string[] = [];
			class MyActivity extends Activity {
				override navigationPageId = "foo";
				override async handleNavigationDetailAsync(
					detail: string,
					navigationPath: NavigationContext,
				) {
					t.count("handler");
					t.log("Detail: ", detail);
					details.push(detail);
					if (navigationPath !== app.navigation)
						t.fail("Invalid navigation path");
				}
			}
			let activity = new MyActivity();
			goTo("foo");
			app.addActivity(activity);
			await t.sleep(1);
			t.expectCount("handler").toBe(1);
			goTo("foo", "bar");
			await t.sleep(1);
			t.expectCount("handler").toBe(2);
			goTo("foo", "bar/baz");
			await t.sleep(1);
			goTo("foo");
			await t.sleep(1);
			t.expectCount("handler").toBe(4);
			expect(details).toBeArray(["", "bar", "bar/baz", ""]);
		});

		test("Quick path changes", async (t) => {
			class MyActivity extends Activity {
				override navigationPageId = "foo";
				protected override async beforeActiveAsync() {
					await t.sleep(20);
					t.count("active");
				}
				protected override async beforeInactiveAsync() {
					await t.sleep(20);
					t.count("inactive");
				}
			}

			// test synchronous changes:
			let activity = new MyActivity();
			app.addActivity(activity);
			t.log("Setting path synchronously: foo");
			goTo("foo");
			t.log("Setting path synchronously: bar");
			goTo("bar");
			t.log("Setting path synchronously: foo");
			goTo("foo");
			t.log("Waiting...");
			await t.sleep(50);
			t.expectCount("active").toBe(1);
			t.expectCount("inactive").toBe(0);

			// test cancellation:
			let error = await t.tryRunAsync(async () => {
				t.log("Setting path asynchronously: bar");
				goTo("bar");
				await t.sleep(1); // inactivate
				t.log("Setting path asynchronously: foo");
				goTo("foo");
				await t.sleep(1); // activate, cancelled!
				t.log("Setting path asynchronously: bar");
				goTo("bar");
				await t.sleep(20); // inactivate, skipped
			});
			t.log(
				`Active: ${t.getCount("active")}, Inactive: ${t.getCount("inactive")}`,
			);
			t.expectCount("active").toBe(1);
			t.expectCount("inactive").toBe(1);
			expect(error)
				.asString()
				.toMatchRegExp(/cancelled/);
		});
	});
});
