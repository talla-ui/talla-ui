import {
	expectNavAsync,
	expectOutputAsync,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, describe, expect, test } from "vitest";
import {
	$navigation,
	Activity,
	app,
	AppContext,
	AsyncTaskQueue,
	ManagedList,
	ManagedObject,
	ui,
	UILabel,
} from "../../dist/index.js";

beforeEach(() => {
	AppContext.setErrorHandler((err) => {
		throw err;
	});
});

// use private property from Binding to create mock app object
const appLabel = ($navigation("pageId") as any)._label;
const mockApp = Object.assign(new ManagedObject(), {
	[appLabel]: true,
	add<T extends Activity>(a: T) {
		return (this as any).attach(a) as T;
	},
	navigation: {},
	renderer: {},
});

describe("Activation and deactivation, standalone", () => {
	function setup() {
		class MyActivity extends Activity {
			beforeActiveCalled = 0;
			beforeInactiveCalled = 0;
			protected override async beforeActiveAsync() {
				await new Promise((r) => setTimeout(r, 10));
				this.beforeActiveCalled++;
			}
			protected override async beforeInactiveAsync() {
				await new Promise((r) => setTimeout(r, 10));
				this.beforeInactiveCalled++;
			}
		}
		return { MyActivity };
	}

	test("Activate base class", async () => {
		let a = mockApp.add(new Activity());
		expect(a.isActive()).toBeFalsy();
		await a.activateAsync();
		expect(a.isActive()).toBeTruthy();
	});

	test("Activate without attaching (error)", async () => {
		let a = new Activity();
		await expect(a.activateAsync()).rejects.toThrow(/attached/);
	});

	test("Deactivate base class", async () => {
		let a = mockApp.add(new Activity());
		await a.activateAsync();
		expect(a.isActive()).toBeTruthy();
		await a.deactivateAsync();
		expect(a.isActive()).toBeFalsy();
	});

	test("Activate base class twice, awaited", async () => {
		let a = mockApp.add(new Activity());
		await a.activateAsync();
		expect(a.isActive()).toBeTruthy();
		await a.activateAsync();
		expect(a.isActive()).toBeTruthy();
	});

	test("Activate base class twice, not awaited", async () => {
		let a = mockApp.add(new Activity());
		a.activateAsync().catch((err) => expect.fail(String(err)));
		expect(a.isActive()).toBeFalsy();
		expect(a.isActivating()).toBeTruthy();
		await a.activateAsync();
		expect(a.isActive()).toBeTruthy();
	});

	test("Deactivate base class twice, awaited", async () => {
		let a = mockApp.add(new Activity());
		await a.activateAsync();
		await a.deactivateAsync();
		expect(a.isActive()).toBeFalsy();
		await a.deactivateAsync();
		expect(a.isActive()).toBeFalsy();
	});

	test("Deactivate base class twice, not awaited", async () => {
		let a = mockApp.add(new Activity());
		await a.activateAsync();
		a.deactivateAsync().catch((err) => expect.fail(String(err)));
		expect(a.isActive()).toBeTruthy();
		expect(a.isDeactivating()).toBeTruthy();
		await a.deactivateAsync();
		expect(a.isActive()).toBeFalsy();
	});

	test("Handlers called on derived class", async () => {
		let { MyActivity } = setup();
		let a = mockApp.add(new MyActivity());
		await a.activateAsync();
		await a.deactivateAsync();
		expect(a).toHaveProperty("beforeActiveCalled", 1);
		expect(a).toHaveProperty("beforeInactiveCalled", 1);
	});

	test("Activation events", async () => {
		let active = 0;
		let inactive = 0;
		let { MyActivity } = setup();
		let a = mockApp.add(new MyActivity());
		a.listen((e) => {
			if (e.name === "Active") active++;
			if (e.name === "Inactive") inactive++;
		});
		await a.activateAsync();
		expect(active).toBe(1);
		expect(inactive).toBe(0);
		await a.deactivateAsync();
		expect(active).toBe(1);
		expect(inactive).toBe(1);
	});

	test("Deactivate while activating runs after", async () => {
		let { MyActivity } = setup();
		let a = mockApp.add(new MyActivity());
		let p = a.activateAsync().catch((err) => {
			throw new Error(err);
		});
		await new Promise((r) => {
			setTimeout(r, 1);
		}); // start activating
		let q = a.deactivateAsync().catch((err) => {
			throw new Error(err);
		});
		await p;
		expect(a.isActive()).toBeTruthy();
		await q;
		expect(a.isActive()).toBeFalsy();
		expect(a.beforeActiveCalled).toBe(1);
		expect(a.beforeInactiveCalled).toBe(1);
	});

	test("Cancelling and skipping based on activation queue", async () => {
		let { MyActivity } = setup();
		let cancelled = 0;
		let a = mockApp.add(new MyActivity());
		a.activateAsync().catch(() => cancelled++); // activates
		a.activateAsync().catch(() => cancelled++); // skips
		a.deactivateAsync().catch(() => cancelled++); // cancelled
		await a.activateAsync(); // skips
		expect(a.isActive()).toBeTruthy();
		expect(cancelled).toBe(1);
		expect(a).toHaveProperty("beforeActiveCalled", 1);
		expect(a).toHaveProperty("beforeInactiveCalled", 0);
	});

	test("Switch 5 times only switches once", async () => {
		let active = 0;
		let inactive = 0;
		let { MyActivity } = setup();
		let a = mockApp.add(new MyActivity());
		a.listen((e) => {
			if (e.name === "Active") active++;
			if (e.name === "Inactive") inactive++;
		});
		await a.activateAsync();
		// since last transition is deactivate, first call should
		// succeed, others should skip or cancel
		a.deactivateAsync().catch((err) => expect.fail(String(err))); // skip
		a.activateAsync() // cancel
			.then(() => expect.fail("Not cancelled"))
			.catch(() => {});
		a.deactivateAsync().catch((err) => expect.fail(String(err))); // skip async
		a.activateAsync() // cancel
			.then(() => expect.fail("Not cancelled"))
			.catch(() => {});
		await a.deactivateAsync(); // skip async
		expect(a.isActive()).toBeFalsy();
		expect(a).toHaveProperty("beforeActiveCalled", 1);
		expect(a).toHaveProperty("beforeInactiveCalled", 1);
		expect(active).toBe(1);
		expect(inactive).toBe(1);
	});

	test("Unlinked activity can't be transitioned", async () => {
		let a = mockApp.add(new Activity());
		a.unlink();
		await expect(a.activateAsync()).rejects.toThrow();
		await expect(a.deactivateAsync()).rejects.toThrow();
	});

	test("Unlinked activity can't be transitioned async", async () => {
		let a = mockApp.add(new Activity());
		let p = expect(a.activateAsync()).rejects.toThrow();
		a.unlink();
		await p;
		let b = mockApp.add(new Activity());
		await b.activateAsync();
		let q = expect(b.deactivateAsync()).rejects.toThrow();
		b.unlink();
		await q;
	});
});

describe("Active task queue", () => {
	class MyActivity extends Activity {
		q = this.createActiveTaskQueue({ maxSyncTime: 10 });
	}

	test("Queue starts when activated", async () => {
		let task = 0;
		let activity = mockApp.add(new MyActivity());
		expect(activity.q).toBeInstanceOf(AsyncTaskQueue);
		expect(activity.q.options.maxSyncTime).toBe(10);
		activity.q.add(() => {
			task++;
		});
		expect(activity.q.isPaused()).toBeTruthy();
		await activity.activateAsync();
		expect(activity.q.isPaused()).toBeFalsy();
		await activity.q.waitAsync();
		expect(task).toBe(1);
	});

	test("Queue pauses when inactivated", async () => {
		let activity = mockApp.add(new MyActivity());
		await activity.activateAsync();
		await activity.q.waitAsync();
		await activity.deactivateAsync();
		expect(activity.q.isPaused()).toBeTruthy();
	});

	test("Queue stops when unlinked", async () => {
		let task = 0;
		let activity = mockApp.add(new MyActivity());
		await activity.activateAsync();
		activity.q.add(() => {
			task++;
		});
		let p = activity.q.waitAsync().catch((err) => err);
		activity.unlink();
		expect(String(await p)).toMatch(/stopped/);
	});
});

describe("Change event watches", () => {
	test("Watch receives change events", () => {
		let events = 0;
		let a = new Activity();
		let o = new ManagedObject();
		a.watch(o, () => {
			events++;
		});
		o.emitChange("Yes");
		expect(events).toBe(1);
	});

	test("Watch doesn't receive other events", () => {
		let events = 0;
		let a = new Activity();
		let o = new ManagedObject();
		a.watch(o, () => {
			events++;
		});
		o.emit("Nope");
		expect(events).toBe(0);
	});

	test("Watch stops when activity unlinked", () => {
		let events = 0;
		let a = new Activity();
		let o = new ManagedObject();
		a.watch(o, () => {
			events++;
		});
		o.emitChange("Yes");
		a.unlink();
		o.emitChange("Yes");
		expect(events).toBe(1);
	});
});

describe("Global context and parents", () => {
	beforeEach(() => {
		useTestContext({ navigationDelay: 1 });
	});

	test("Add activity", () => {
		let activity = new Activity();
		app.addActivity(activity);
		expect(app.activities.getActivities().includes(activity)).toBeTruthy();
	});

	test("Global context is parent", () => {
		let activity = new Activity();
		app.addActivity(activity);
		expect(ManagedObject.whence.call(AppContext as any, activity)).toBe(app);
	});

	test("Nested activities", () => {
		class MyActivity extends Activity {
			nested = this.attach(new ManagedList().restrict(MyActivity));
		}
		let activity = new MyActivity();
		activity.nested.add(new MyActivity());
		app.addActivity(activity);
		expect(Activity.whence(activity)).toBeUndefined();
		expect(Activity.whence(activity.nested.first())).toBe(activity);
		expect(
			ManagedObject.whence.call(AppContext as any, activity.nested.first()),
		).toBe(app);
	});

	test("Navigate app to activity path", async () => {
		let activity = new Activity();
		activity.navigationPageId = "foo";
		app.addActivity(activity);
		app.navigate(activity);
		await expectNavAsync({ timeout: 10, pageId: "foo" });
		expect(activity.isActive()).toBeTruthy();
	});

	test("Navigate app to activity path with detail", async () => {
		let activity = new Activity();
		activity.navigationPageId = "foo";
		app.addActivity(activity);
		app.navigate(activity.getNavigationTarget("bar"));
		await expectNavAsync({ timeout: 10, pageId: "foo", detail: "bar" });
		expect(activity.isActive()).toBeTruthy();
	});
});

describe("View rendering", () => {
	beforeEach(() => {
		useTestContext({ renderFrequency: 5 });
	});

	test("Rendered page view", async () => {
		class MyActivity extends Activity {
			protected override createView() {
				return ui.cell(ui.label("Hello, world!")).create();
			}
		}
		let activity = new MyActivity();
		app.addActivity(activity, true);
		await expectOutputAsync({ timeout: 50, type: "label" });
	});

	test("Find views", async () => {
		class MyActivity extends Activity {
			protected override createView() {
				return ui.cell(ui.label("foo"), ui.label("bar")).create();
			}
		}
		let activity = new MyActivity();
		app.addActivity(activity, true);
		await expectOutputAsync({ timeout: 50, type: "cell" });
		expect(activity.findViewContent(UILabel)).toHaveLength(2);
	});
});
