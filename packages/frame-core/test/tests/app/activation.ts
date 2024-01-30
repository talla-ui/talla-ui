import {
	app,
	NavigationPath,
	Activity,
	ManagedObject,
} from "../../../dist/index.js";
import {
	describe,
	expect,
	test,
	useTestContext,
} from "@desk-framework/frame-test";

describe("NavigationPath and ActivityContext", () => {
	describe("NavigationPath standalone", () => {
		test("Set, get path", () => {
			let p = new NavigationPath();
			p.path = "foo";
			expect(p.path).toBe("foo");
			p.path = "/bar/";
			expect(p.path).toBe("bar");
		});

		test("Set, get path undefined", () => {
			let p = new NavigationPath();
			p.path = "foo";
			p.path = undefined as any;
			expect(p.path).toBe("");
		});

		test("Path parts: empty", () => {
			let p = new NavigationPath();
			expect(p.path).toBe("");
			expect(p.pageId).toBe("");
			expect(p.detail).toBe("");
		});

		test("Path parts: single token", () => {
			let p = new NavigationPath();
			p.path = "foo";
			expect(p.path).toBe("foo");
			expect(p.pageId).toBe("foo");
			expect(p.detail).toBe("");
		});

		test("Path parts: full path", () => {
			let p = new NavigationPath();
			p.path = "foo/bar/baz";
			expect(p.path).toBe("foo/bar/baz");
			expect(p.pageId).toBe("foo");
			expect(p.detail).toBe("bar/baz");
		});
	});

	describe("ActivityContext and activities", (scope) => {
		scope.beforeEach(() => {
			useTestContext((options) => {
				options.pathDelay = 0;
			});
		});

		test("Activity context Object and properties", (t) => {
			expect(ManagedObject.whence(app.activities)).toBe(app);
			expect(app.activities.getAll()).toBeArray(0);
			expect(app.activities.getActive()).toBeArray(0);
			expect(app.activities.navigationPath).toBeInstanceOf(NavigationPath);
			expect(ManagedObject.whence(app.activities.navigationPath)).toBe(
				app.activities,
			);
		});

		test("Activity activated when added", async (t) => {
			let activity = new Activity();
			activity.navigationPageId = "foo";
			app.activities.navigationPath.path = "foo";
			app.activities.add(activity);
			await t.sleep(1);
			expect(activity.isActive()).toBeTruthy();
		});

		test("Activity activated when app path changed (async)", async (t) => {
			let activity = new Activity();
			activity.navigationPageId = "foo";
			app.activities.navigationPath.path = "bar";
			app.activities.add(activity);
			await t.sleep(1);
			expect(activity.isActive()).toBeFalsy();
			app.activities.navigationPath.path = "foo";
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
			app.activities.add(activity);
			app.activities.navigationPath.path = "foo";
			await t.sleep(1);
			t.expectCount("active").toBe(1);
			app.activities.navigationPath.path = "bar";
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
					navigationPath: NavigationPath,
				) {
					t.count("handler");
					t.log("Detail: ", detail);
					details.push(detail);
					if (navigationPath !== app.activities.navigationPath)
						t.fail("Invalid navigation path");
				}
			}
			let activity = new MyActivity();
			app.activities.navigationPath.path = "foo";
			app.activities.add(activity);
			await t.sleep(1);
			t.expectCount("handler").toBe(1);
			app.activities.navigationPath.path = "foo/bar";
			await t.sleep(1);
			t.expectCount("handler").toBe(2);
			app.activities.navigationPath.path = "foo/bar/baz";
			await t.sleep(1);
			app.activities.navigationPath.path = "foo";
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
			app.activities.add(activity);
			t.log("Setting path synchronously: foo");
			app.activities.navigationPath.path = "foo";
			t.log("Setting path synchronously: bar");
			app.activities.navigationPath.path = "bar";
			t.log("Setting path synchronously: foo");
			app.activities.navigationPath.path = "foo";
			t.log("Waiting...");
			await t.sleep(50);
			t.expectCount("active").toBe(1);
			t.expectCount("inactive").toBe(0);

			// test cancellation:
			let error = await t.tryRunAsync(async () => {
				t.log("Setting path asynchronously: bar");
				app.activities.navigationPath.path = "bar";
				await t.sleep(1); // inactivate
				t.log("Setting path asynchronously: foo");
				app.activities.navigationPath.path = "foo";
				await t.sleep(1); // activate, cancelled!
				t.log("Setting path asynchronously: bar");
				app.activities.navigationPath.path = "bar";
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
