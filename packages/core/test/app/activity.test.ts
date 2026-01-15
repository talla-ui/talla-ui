import { expectOutputAsync, useTestContext } from "@talla-ui/test-handler";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
	Activity,
	app,
	AppContext,
	AsyncTaskQueue,
	Binding,
	ComponentView,
	ComponentViewBuilder,
	ObservableObject,
	UI,
	UICell,
	UIText,
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
			afterActiveCalled = 0;
			afterInactiveCalled = 0;
			protected override async afterActive(signal: AbortSignal) {
				await new Promise((r) => setTimeout(r, 10));
				if (!signal.aborted) this.afterActiveCalled++;
			}
			protected override async afterInactive() {
				await new Promise((r) => setTimeout(r, 10));
				this.afterInactiveCalled++;
			}
		}
		return { MyActivity };
	}

	test("Activate base class", () => {
		let a = addActivity(new Activity());
		expect(app.activities.toArray().includes(a)).toBeTruthy();
		expect(a.isActive()).toBeFalsy();
		a.activate();
		expect(a.isActive()).toBeTruthy();
	});

	test("Activate without attaching (error)", () => {
		let a = new Activity();
		expect(() => a.activate()).toThrow(/attached/);
	});

	test("Deactivate base class", () => {
		let a = addActivity(new Activity());
		a.activate();
		expect(a.isActive()).toBeTruthy();
		a.deactivate();
		expect(a.isActive()).toBeFalsy();
	});

	test("Activate base class twice", () => {
		let a = addActivity(new Activity());
		a.activate();
		expect(a.isActive()).toBeTruthy();
		a.activate();
		expect(a.isActive()).toBeTruthy();
	});

	test("Deactivate base class twice", () => {
		let a = addActivity(new Activity());
		a.activate();
		a.deactivate();
		expect(a.isActive()).toBeFalsy();
		a.deactivate();
		expect(a.isActive()).toBeFalsy();
	});

	test("Handlers called on derived class", async () => {
		let { MyActivity } = setup();
		let a = addActivity(new MyActivity());
		a.activate();
		await expect
			.poll(() => a.afterActiveCalled, { interval: 5, timeout: 100 })
			.toBe(1);
		a.deactivate();
		await expect
			.poll(() => a.afterInactiveCalled, { interval: 5, timeout: 100 })
			.toBe(1);
	});

	test("Activation events", () => {
		let active = 0;
		let inactive = 0;
		let { MyActivity } = setup();
		let a = addActivity(new MyActivity());
		a.listen((e) => {
			if (e.name === "Active") active++;
			if (e.name === "Inactive") inactive++;
		});
		a.activate();
		expect(active).toBe(1);
		expect(inactive).toBe(0);
		a.deactivate();
		expect(active).toBe(1);
		expect(inactive).toBe(1);
	});

	test("AbortSignal is aborted on deactivate", async () => {
		let { MyActivity } = setup();
		let a = addActivity(new MyActivity());
		a.activate();
		expect(a.activeSignal.aborted).toBeFalsy();
		a.deactivate();
		expect(a.activeSignal.aborted).toBeTruthy();
		// afterActiveCalled should remain 0 because signal was aborted before increment
		// Wait for afterInactiveCalled to complete, then verify afterActiveCalled stayed 0
		await expect
			.poll(() => a.afterInactiveCalled, { interval: 5, timeout: 100 })
			.toBe(1);
		expect(a).toHaveProperty("afterActiveCalled", 0);
	});

	test("Rapid activate/deactivate", () => {
		let active = 0;
		let inactive = 0;
		let { MyActivity } = setup();
		let a = addActivity(new MyActivity());
		a.listen((e) => {
			if (e.name === "Active") active++;
			if (e.name === "Inactive") inactive++;
		});
		a.activate();
		a.deactivate();
		a.activate();
		a.deactivate();
		a.activate();
		expect(a.isActive()).toBeTruthy();
		expect(active).toBe(3);
		expect(inactive).toBe(2);
	});

	test("Unlinked activity can't be activated", () => {
		let a = addActivity(new Activity());
		a.unlink();
		expect(() => a.activate()).toThrow(/unlinked/i);
	});

	test("afterActive error is passed to errorHandler", async () => {
		const mockErrorHandler = vi.fn();
		AppContext.setErrorHandler(mockErrorHandler);

		class ErrorActivity extends Activity {
			protected override async afterActive(signal: AbortSignal) {
				throw new Error("Test error");
			}
		}
		let a = addActivity(new ErrorActivity());
		a.activate();
		await expect
			.poll(() => mockErrorHandler.mock.calls.length > 0, {
				interval: 5,
				timeout: 100,
			})
			.toBe(true);
		expect(mockErrorHandler).toHaveBeenCalledWith(expect.any(Error));
	});

	test("afterActive AbortError is silently ignored", async () => {
		const mockErrorHandler = vi.fn();
		AppContext.setErrorHandler(mockErrorHandler);

		class AbortActivity extends Activity {
			protected override async afterActive(signal: AbortSignal) {
				const err = new Error("Aborted");
				err.name = "AbortError";
				throw err;
			}
		}
		let a = addActivity(new AbortActivity());
		a.activate();
		await new Promise((r) => setTimeout(r, 20));
		expect(mockErrorHandler).not.toHaveBeenCalled();
	});

	test("activeSignal is reset on reactivation", () => {
		let a = addActivity(new Activity());
		a.activate();
		let signal1 = a.activeSignal;
		expect(signal1.aborted).toBe(false);

		a.deactivate();
		expect(signal1.aborted).toBe(true);

		a.activate();
		let signal2 = a.activeSignal;
		expect(signal2).not.toBe(signal1);
		expect(signal2.aborted).toBe(false);
	});

	test("afterActive and afterInactive are not called synchronously", async () => {
		let afterActiveCalled = false;
		let afterInactiveCalled = false;

		class MyActivity extends Activity {
			protected override afterActive(signal: AbortSignal) {
				afterActiveCalled = true;
			}
			protected override afterInactive() {
				afterInactiveCalled = true;
			}
		}
		let a = addActivity(new MyActivity());
		a.activate();
		expect(afterActiveCalled).toBe(false); // Not called synchronously
		await expect
			.poll(() => afterActiveCalled, { interval: 5, timeout: 100 })
			.toBe(true);

		a.deactivate();
		expect(afterInactiveCalled).toBe(false); // Not called synchronously
		await expect
			.poll(() => afterInactiveCalled, { interval: 5, timeout: 100 })
			.toBe(true);
	});

	test("afterInactive is not called if reactivated quickly", async () => {
		let afterInactiveCalled = false;

		class MyActivity extends Activity {
			protected override afterInactive() {
				afterInactiveCalled = true;
			}
		}
		let a = addActivity(new MyActivity());
		a.activate();
		a.deactivate();
		a.activate(); // Reactivate immediately
		await new Promise((r) => setTimeout(r, 50));
		expect(afterInactiveCalled).toBe(false); // Should not be called
	});

	test("activeSignal is aborted on unlink", async () => {
		let a = addActivity(new Activity());
		a.activate();
		let signal = a.activeSignal;
		expect(signal.aborted).toBe(false);
		a.unlink();
		expect(signal.aborted).toBe(true);
	});

	test("afterInactive is not called on unlink", async () => {
		let afterInactiveCalled = false;

		class MyActivity extends Activity {
			protected override afterInactive() {
				afterInactiveCalled = true;
			}
		}
		let a = addActivity(new MyActivity());
		a.activate();
		await new Promise((r) => setTimeout(r, 10)); // Let scheduler run
		a.unlink();
		await new Promise((r) => setTimeout(r, 50));
		expect(afterInactiveCalled).toBe(false);
	});

	test("afterInactive called once for double activate/deactivate", async () => {
		let afterInactiveCount = 0;

		class MyActivity extends Activity {
			protected override afterInactive() {
				afterInactiveCount++;
			}
		}
		let a = addActivity(new MyActivity());
		a.activate();
		a.deactivate();
		a.activate();
		a.deactivate();
		await new Promise((r) => setTimeout(r, 50));
		expect(afterInactiveCount).toBe(1); // Only the last deactivation
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
		activity.activate();
		expect(activity.q.isPaused()).toBeFalsy();
		await activity.q.waitAsync();
		expect(task).toBe(1);
	});

	test("Queue pauses when inactivated", async () => {
		let activity = addActivity(new MyActivity());
		activity.activate();
		await activity.q.waitAsync();
		activity.deactivate();
		expect(activity.q.isPaused()).toBeTruthy();
	});

	test("Queue stops when unlinked", async () => {
		let task = 0;
		let activity = addActivity(new MyActivity());
		activity.activate();
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
		useTestContext((options) => {
			options.navigationDelay = 1;
		});
	});

	test("Add activity", () => {
		let activity = new Activity();
		app.addActivity(activity);
		expect(app.activities.toArray().includes(activity)).toBeTruthy();
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
				return UI.Cell(UI.Text("Hello, world!"));
			}
		}
		let activity = new MyActivity();
		app.addActivity(activity, true);
		await expectOutputAsync({ timeout: 50, type: "text" });
	});

	test("Find views", async () => {
		class MyActivity extends Activity {
			static override View() {
				return UI.Cell(UI.Text("foo"), UI.Text("bar"));
			}
		}
		let activity = new MyActivity();
		app.addActivity(activity, true);
		await expectOutputAsync({ timeout: 50, type: "cell" });
		expect(activity.findViewContent(UIText)).toHaveLength(2);
	});

	test("Nested views with bindings", async () => {
		class MyComponentView extends ComponentView {
			foo = 2;
		}
		function MyComponent(
			foo: number,
			...content: Array<ViewBuilder | undefined>
		) {
			let builder = ComponentViewBuilder(MyComponentView, (v) =>
				UI.Column(UI.Text(v.bind("foo")), ...content),
			);
			builder.initializer.set("foo", foo);
			return builder;
		}
		class MyActivity extends Activity {
			static override View(v: Binding<MyActivity>) {
				return UI.Cell(
					UI.Text(v.bind("foo")),
					MyComponent(2, UI.Text(v.bind("foo")), UI.Text(v.bind("bar"))),
				);
			}

			foo = 1;
			bar = 3;
		}
		let activity = new MyActivity();
		app.addActivity(activity, true);
		await expectOutputAsync({ timeout: 50, type: "cell" });
		let texts = activity.findViewContent(UIText);
		expect(texts.map((l) => l.text)).toEqual([1, 2, 1, 3]);
	});

	test("View is created asynchronously after activation", async () => {
		class MyActivity extends Activity {
			static override View() {
				return UI.Cell();
			}
		}
		let a = new MyActivity();
		app.addActivity(a);
		a.activate();

		// View not immediately available (scheduled)
		expect(a.view).toBeUndefined();

		// Wait for schedule to run
		await expect
			.poll(() => a.view instanceof UICell, { interval: 5, timeout: 100 })
			.toBe(true);
	});

	test("View is available in afterActive", async () => {
		let viewInAfterActive: any = undefined;

		class MyActivity extends Activity {
			static override View() {
				return UI.Cell(UI.Text("test"));
			}
			protected override afterActive(signal: AbortSignal) {
				viewInAfterActive = this.view;
			}
		}
		let a = new MyActivity();
		app.addActivity(a);
		a.activate();

		// Wait for afterActive to be called
		await expect
			.poll(() => viewInAfterActive !== undefined, {
				interval: 5,
				timeout: 100,
			})
			.toBe(true);

		// View should have been available in afterActive
		expect(viewInAfterActive).toBeInstanceOf(UICell);
	});

	test("View not created if deactivated before scheduler runs", async () => {
		let viewCreated = false;
		class MyActivity extends Activity {
			static override View() {
				viewCreated = true;
				return UI.Cell();
			}
		}
		let a = addActivity(new MyActivity());
		a.activate();
		expect(a.view).toBeUndefined();
		a.deactivate();
		await new Promise((r) => setTimeout(r, 50));
		expect(viewCreated).toBe(false);
		expect(a.view).toBeUndefined();
	});
});
