import { expectOutputAsync, useTestContext } from "@talla-ui/test-handler";
import { beforeEach, describe, expect, test } from "vitest";
import {
	Activity,
	app,
	AppContext,
	AsyncTaskQueue,
	UI,
	ObservableObject,
	UILabel,
	ComponentView,
	ComponentViewBuilder,
	Binding,
	ViewBuilder,
} from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

function addActivity<T extends Activity>(a: T) {
	app.addActivity(a);
	return a;
}

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
		let a = addActivity(new Activity());
		expect(app.activities.includes(a)).toBeTruthy();
		expect(app.getActivity(Activity)).toBe(a);
		expect(a.isActive()).toBeFalsy();
		await a.activateAsync();
		expect(a.isActive()).toBeTruthy();
	});

	test("Activate without attaching (error)", async () => {
		let a = new Activity();
		await expect(a.activateAsync()).rejects.toThrow(/attached/);
	});

	test("Deactivate base class", async () => {
		let a = addActivity(new Activity());
		await a.activateAsync();
		expect(a.isActive()).toBeTruthy();
		await a.deactivateAsync();
		expect(a.isActive()).toBeFalsy();
	});

	test("Activate base class twice, awaited", async () => {
		let a = addActivity(new Activity());
		await a.activateAsync();
		expect(a.isActive()).toBeTruthy();
		await a.activateAsync();
		expect(a.isActive()).toBeTruthy();
	});

	test("Activate base class twice, not awaited", async () => {
		let a = addActivity(new Activity());
		a.activateAsync().catch((err) => expect.fail(String(err)));
		expect(a.isActive()).toBeFalsy();
		expect(a.isActivating()).toBeTruthy();
		await a.activateAsync();
		expect(a.isActive()).toBeTruthy();
	});

	test("Deactivate base class twice, awaited", async () => {
		let a = addActivity(new Activity());
		await a.activateAsync();
		await a.deactivateAsync();
		expect(a.isActive()).toBeFalsy();
		await a.deactivateAsync();
		expect(a.isActive()).toBeFalsy();
	});

	test("Deactivate base class twice, not awaited", async () => {
		let a = addActivity(new Activity());
		await a.activateAsync();
		a.deactivateAsync().catch((err) => expect.fail(String(err)));
		expect(a.isActive()).toBeTruthy();
		expect(a.isDeactivating()).toBeTruthy();
		await a.deactivateAsync();
		expect(a.isActive()).toBeFalsy();
	});

	test("Handlers called on derived class", async () => {
		let { MyActivity } = setup();
		let a = addActivity(new MyActivity());
		await a.activateAsync();
		await a.deactivateAsync();
		expect(a).toHaveProperty("beforeActiveCalled", 1);
		expect(a).toHaveProperty("beforeInactiveCalled", 1);
	});

	test("Activation events", async () => {
		let active = 0;
		let inactive = 0;
		let { MyActivity } = setup();
		let a = addActivity(new MyActivity());
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
		let a = addActivity(new MyActivity());
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
		let a = addActivity(new MyActivity());
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
		let a = addActivity(new MyActivity());
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
		let a = addActivity(new Activity());
		a.unlink();
		await expect(a.activateAsync()).rejects.toThrow();
		await expect(a.deactivateAsync()).rejects.toThrow();
	});

	test("Unlinked activity can't be transitioned async", async () => {
		let a = addActivity(new Activity());
		let p = expect(a.activateAsync()).rejects.toThrow();
		a.unlink();
		await p;
		let b = addActivity(new Activity());
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
		let activity = addActivity(new MyActivity());
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
		let activity = addActivity(new MyActivity());
		await activity.activateAsync();
		await activity.q.waitAsync();
		await activity.deactivateAsync();
		expect(activity.q.isPaused()).toBeTruthy();
	});

	test("Queue stops when unlinked", async () => {
		let task = 0;
		let activity = addActivity(new MyActivity());
		await activity.activateAsync();
		activity.q.add(() => {
			task++;
		});
		let p = activity.q.waitAsync().catch((err) => err);
		activity.unlink();
		expect(String(await p)).toMatch(/stopped/);
	});
});

describe("Global context and parents", () => {
	beforeEach(() => {
		useTestContext({ navigationDelay: 1 });
	});

	test("Add activity", () => {
		let activity = new Activity();
		app.addActivity(activity);
		expect(app.activities.includes(activity)).toBeTruthy();
	});

	test("Global context is parent", () => {
		let activity = new Activity();
		app.addActivity(activity);
		expect(ObservableObject.whence.call(AppContext as any, activity)).toBe(app);
	});
});

describe("View rendering", () => {
	beforeEach(() => {
		useTestContext();
	});

	test("Rendered page view", async () => {
		class MyActivity extends Activity {
			static override View() {
				return UI.Cell(UI.Label("Hello, world!"));
			}
		}
		let activity = new MyActivity();
		app.addActivity(activity, true);
		await expectOutputAsync({ timeout: 50, type: "label" });
	});

	test("Find views", async () => {
		class MyActivity extends Activity {
			static override View() {
				return UI.Cell(UI.Label("foo"), UI.Label("bar"));
			}
		}
		let activity = new MyActivity();
		app.addActivity(activity, true);
		await expectOutputAsync({ timeout: 50, type: "cell" });
		expect(activity.findViewContent(UILabel)).toHaveLength(2);
	});

	test("Nested views with bindings", async () => {
		class MyComponentView extends ComponentView {
			foo = 2;
		}
		function MyComponent(foo: number, ...content: ViewBuilder[]) {
			let builder = ComponentViewBuilder(MyComponentView, (v) =>
				UI.Column(UI.Label(v.bind("foo")), ...content),
			);
			builder.initializer.set("foo", foo);
			return builder;
		}
		class MyActivity extends Activity {
			static override View(v: Binding<MyActivity>) {
				return UI.Cell(
					UI.Label(v.bind("foo")),
					MyComponent(2, UI.Label(v.bind("foo")), UI.Label(v.bind("bar"))),
				);
			}

			foo = 1;
			bar = 3;
		}
		let activity = new MyActivity();
		app.addActivity(activity, true);
		await expectOutputAsync({ timeout: 50, type: "cell" });
		let labels = activity.findViewContent(UILabel);
		expect(labels.map((l) => l.text)).toEqual([1, 2, 1, 3]);
	});
});
