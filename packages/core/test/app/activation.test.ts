import { expectOutputAsync, useTestContext } from "@talla-ui/test-handler";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
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
		useTestContext((options) => {
			options.navigationDelay = 0;
		});
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
		await expect
			.poll(() => activity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		expect(app.navigation?.matchedPath).toBe("foo");
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
		await expect.poll(() => updated, { interval: 5, timeout: 100 }).toBe(4); // once for activation
		app.navigation?.set("");
		await expect
			.poll(() => !activity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
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
		await expect
			.poll(() => activityBar.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		expect(activityFoo.isActive()).toBeFalsy();
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
		await expect
			.poll(() => !activity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		app.navigation?.set("foo");
		await expect
			.poll(() => activity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
	});

	test("Activity activated based on exact path", async () => {
		let active = 0;
		let inactive = 0;
		class MyActivity extends Activity {
			override navigationPath = "foo";
			protected override afterActive(signal: AbortSignal) {
				active++;
			}
			protected override afterInactive() {
				inactive++;
			}
		}
		let activity = new MyActivity();
		app.addActivity(activity);
		app.navigation?.set("foo");
		await expect.poll(() => active, { interval: 5, timeout: 100 }).toBe(1);
		app.navigation?.set("bar");
		await expect.poll(() => inactive, { interval: 5, timeout: 100 }).toBe(1);
		app.navigation?.set("foo/bar");
		await expect
			.poll(() => !activity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		expect(active).toBe(1);
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
			protected override afterActive(signal: AbortSignal) {
				active++;
			}
			protected override afterInactive() {
				inactive++;
			}
		}
		let activity = new MyActivity();
		app.addActivity(activity);
		app.navigation?.set("foo");
		await expect.poll(() => active, { interval: 5, timeout: 100 }).toBe(1);
		app.navigation?.set("bar");
		await expect.poll(() => inactive, { interval: 5, timeout: 100 }).toBe(1);
		app.navigation?.set("foo/bar");
		await expect.poll(() => active, { interval: 5, timeout: 100 }).toBe(2);
		expect(called).toBe(2);
	});

	test("Quick path changes", async () => {
		let active = 0;
		let inactive = 0;
		class MyFooActivity extends Activity {
			override navigationPath = "foo";
			protected override async afterActive(signal: AbortSignal) {
				console.log("foo: afterActive [...");
				await new Promise((r) => setTimeout(r, 20));
				if (!signal.aborted) {
					active++;
					console.log("...] foo: afterActive", active);
				} else {
					console.log("...] foo: afterActive (aborted)");
				}
			}
			protected override async afterInactive() {
				console.log("foo: afterInactive [...");
				await new Promise((r) => setTimeout(r, 20));
				inactive++;
				console.log("...] foo: afterInactive", inactive);
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
		// With sync activation and router queue, rapid navigation cancels intermediate states
		// Only the final state (foo) is activated, previous navigations are aborted
		await expect.poll(() => active, { interval: 5, timeout: 200 }).toBe(1);
		expect(inactive).toBe(0); // bar was never activated, so no deactivation

		// reset for async test
		active = 0;
		inactive = 0;

		// test async navigation changes with enough time for each to complete
		console.log("Setting path asynchronously: bar");
		app.navigation?.set("bar");
		// Wait for foo to deactivate
		await expect.poll(() => inactive, { interval: 5, timeout: 200 }).toBe(1);
		console.log("Setting path asynchronously: foo");
		app.navigation?.set("foo");
		// Wait for foo to activate again
		await expect.poll(() => active, { interval: 5, timeout: 200 }).toBe(1);
	});
});

describe("Nested activity router", () => {
	beforeEach(() => {
		useTestContext((options) => {
			options.navigationDelay = 0;
		});
	});

	class MyActivity extends Activity {
		static override View(v: Binding<MyActivity>) {
			return UI.Text(v.bind("text"));
		}
		constructor(public text: string) {
			super();
		}
		router = this.createActiveRouter();
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
		activity.deactivate();
		expect(nested1.isActive()).toBe(false);
		expect(nested2.isActive()).toBe(false);
	});

	test("Replace unlinks other activity", async () => {
		let activity = new MyActivity("root");
		let nested1 = new MyActivity("nested1");
		let nested2 = new MyActivity("nested2");
		app.addActivity(activity);
		activity.activate();
		activity.router.add(nested1, true);
		expect(nested1.isActive()).toBe(true);
		activity.router.replace(nested2);
		expect(nested1.isUnlinked()).toBe(true);
	});

	test("Nested activities handle rapid parent state changes", async () => {
		let childAfterInactiveCalled = 0;

		class ChildActivity extends Activity {
			static override View() {
				return UI.Column();
			}
			protected override afterInactive() {
				childAfterInactiveCalled++;
			}
		}

		let activity = new MyActivity("root");
		let child = new ChildActivity();
		activity.router.add(child);
		app.addActivity(activity);

		// Rapid parent state changes
		activity.activate();
		child.activate();
		activity.deactivate();
		activity.activate();
		child.activate();

		await expect
			.poll(() => activity.isActive() && child.isActive(), {
				interval: 5,
				timeout: 100,
			})
			.toBe(true);
		// afterInactive should not be called due to reactivation guard
		expect(childAfterInactiveCalled).toBe(0);
	});
});

describe("Navigation guards (canDeactivateAsync)", () => {
	beforeEach(() => {
		useTestContext((options) => {
			options.navigationDelay = 0;
		});
	});

	test("canDeactivateAsync returning false prevents navigation", async () => {
		class BlockingActivity extends Activity {
			override navigationPath = "blocking";
			override async canDeactivateAsync() {
				return false;
			}
		}
		class OtherActivity extends Activity {
			override navigationPath = "other";
		}

		let blocking = new BlockingActivity();
		let other = new OtherActivity();
		app.addActivity(blocking);
		app.addActivity(other);

		// Activate blocking activity
		app.navigation?.set("blocking");
		await expect
			.poll(() => blocking.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);

		// Try to navigate away - should be blocked
		app.navigation?.set("other");

		// Verify blocking activity stays active after navigation attempt settles
		await expect
			.poll(() => blocking.isActive() && !other.isActive(), {
				interval: 5,
				timeout: 100,
			})
			.toBe(true);
	});

	test("canDeactivateAsync returning true allows navigation", async () => {
		class AllowingActivity extends Activity {
			override navigationPath = "allowing";
			override async canDeactivateAsync() {
				return true;
			}
		}
		class OtherActivity extends Activity {
			override navigationPath = "other";
		}

		let allowing = new AllowingActivity();
		let other = new OtherActivity();
		app.addActivity(allowing);
		app.addActivity(other);

		// Activate allowing activity
		app.navigation?.set("allowing");
		await expect
			.poll(() => allowing.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);

		// Navigate away - should succeed
		app.navigation?.set("other");
		await expect
			.poll(() => other.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);

		expect(allowing.isActive()).toBe(false);
	});

	test("canDeactivateAsync async behavior waits for result", async () => {
		let guardCalled = false;
		let guardResolved = false;

		class AsyncGuardActivity extends Activity {
			override navigationPath = "guarded";
			override async canDeactivateAsync() {
				guardCalled = true;
				await new Promise((r) => setTimeout(r, 30));
				guardResolved = true;
				return true;
			}
		}
		class OtherActivity extends Activity {
			override navigationPath = "other";
		}

		let guarded = new AsyncGuardActivity();
		let other = new OtherActivity();
		app.addActivity(guarded);
		app.addActivity(other);

		app.navigation?.set("guarded");
		await expect
			.poll(() => guarded.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);

		// Start navigation - guard should be called
		app.navigation?.set("other");
		await expect
			.poll(() => guardCalled, { interval: 5, timeout: 100 })
			.toBe(true);
		expect(guardResolved).toBe(false); // Still waiting (guard has 30ms delay)
		expect(guarded.isActive()).toBe(true); // Still active

		// Wait for guard to resolve and navigation to complete
		await expect
			.poll(() => guardResolved && other.isActive(), {
				interval: 5,
				timeout: 200,
			})
			.toBe(true);
	});

	test("Blocking activity prevents entire navigation", async () => {
		class BlockingActivity extends Activity {
			override navigationPath = "blocking";
			override async canDeactivateAsync() {
				return false;
			}
		}
		class AllowingActivity extends Activity {
			override navigationPath = "allowing";
			override async canDeactivateAsync() {
				return true;
			}
		}
		class TargetActivity extends Activity {
			override navigationPath = "target";
		}

		let blocking = new BlockingActivity();
		let allowing = new AllowingActivity();
		let target = new TargetActivity();
		app.addActivity(blocking);
		app.addActivity(allowing);
		app.addActivity(target);

		// Activate both blocking and allowing
		app.navigation?.set("blocking");
		await expect
			.poll(() => blocking.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);

		// Manually activate allowing too
		allowing.activate();
		expect(allowing.isActive()).toBe(true);

		// Navigate to target - blocking should prevent entire navigation
		app.navigation?.set("target");

		// Verify navigation was blocked - all states remain unchanged
		await expect
			.poll(
				() => blocking.isActive() && allowing.isActive() && !target.isActive(),
				{ interval: 5, timeout: 100 },
			)
			.toBe(true);
	});
});
