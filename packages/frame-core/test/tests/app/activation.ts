import {
	app,
	NavigationController,
	Activity,
	ManagedObject,
} from "../../../dist/index.js";
import {
	describe,
	expect,
	test,
	useTestContext,
} from "@desk-framework/frame-test";

describe("NavigationController and ActivityContext", () => {
	describe("NavigationController standalone", () => {
		test("Set, get page ID", () => {
			let p = new NavigationController();
			p.set("foo");
			expect(p.pageId).toBe("foo");
		});

		test("Set, get page ID and detail", () => {
			let p = new NavigationController();
			p.set("foo", "bar");
			expect(p.pageId).toBe("foo");
			expect(p.detail).toBe("bar");
		});

		test("Set, get path undefined", () => {
			let p = new NavigationController();
			p.set(undefined as any);
			expect(p.pageId).toBe("");
			expect(p.detail).toBe("");
		});

		test("Set invalid path", () => {
			let p = new NavigationController();
			expect(() => p.set("foo/bar")).toThrowError();
			expect(() => p.set(".foo")).toThrowError();
		});
	});

	describe("ActivityContext and activities", (scope) => {
		scope.beforeEach(() => {
			useTestContext((options) => {
				options.navigationDelay = 0;
			});
		});

		function goTo(pageId: string, detail?: string) {
			app.activities.navigationController.set(pageId, detail);
		}

		test("Activity context Object and properties", (t) => {
			expect(ManagedObject.whence(app.activities)).toBe(app);
			expect(app.activities.getAll()).toBeArray(0);
			expect(app.activities.getActive()).toBeArray(0);
			expect(app.activities.navigationController).toBeInstanceOf(
				NavigationController,
			);
			expect(ManagedObject.whence(app.activities.navigationController)).toBe(
				app.activities,
			);
		});

		test("Activity activated when added", async (t) => {
			let activity = new Activity();
			activity.navigationPageId = "foo";
			goTo("foo");
			app.activities.add(activity);
			await t.sleep(1);
			expect(activity.isActive()).toBeTruthy();
		});

		test("Activity activated when app path changed (async)", async (t) => {
			let activity = new Activity();
			activity.navigationPageId = "foo";
			goTo("bar");
			app.activities.add(activity);
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
			app.activities.add(activity);
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
					navigationPath: NavigationController,
				) {
					t.count("handler");
					t.log("Detail: ", detail);
					details.push(detail);
					if (navigationPath !== app.activities.navigationController)
						t.fail("Invalid navigation path");
				}
			}
			let activity = new MyActivity();
			goTo("foo");
			app.activities.add(activity);
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
			app.activities.add(activity);
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
