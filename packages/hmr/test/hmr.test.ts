import { Activity, app, UI } from "@talla-ui/core";
import { useTestContext } from "@talla-ui/test-handler";
import { describe, expect, test } from "vitest";
import { registerActivityHMR } from "../dist/index.js";

/** Creates a mock HMR handle */
function createMockHot() {
	const mock: {
		data: any;
		dispose: (cb: (data: any) => void) => void;
		_disposeCallback?: (data: any) => void;
	} = {
		data: undefined,
		dispose(cb) {
			mock._disposeCallback = cb;
		},
	};
	return mock;
}

/** Simulates a module reload by calling dispose and creating new hot handle */
function simulateReload(hot: ReturnType<typeof createMockHot>) {
	const data = {};
	hot._disposeCallback?.(data);
	const newHot = createMockHot();
	newHot.data = data;
	return newHot;
}

/** Wait for queueMicrotask to complete */
function flushMicrotasks() {
	return new Promise<void>((r) => queueMicrotask(r));
}

describe("registerActivityHMR", () => {
	test("Creates instance tracking set on prototype", () => {
		class TestActivity extends Activity {}
		const hot = createMockHot();

		registerActivityHMR(hot, TestActivity);

		const instanceSet = (TestActivity.prototype as any)._$hotInstances;
		expect(instanceSet).toBeInstanceOf(Set);
	});

	test("Stores class and instances via dispose callback", () => {
		class TestActivity extends Activity {}
		const hot = createMockHot();

		registerActivityHMR(hot, TestActivity);

		const instanceSet = (TestActivity.prototype as any)._$hotInstances;
		const data: any = {};
		hot._disposeCallback?.(data);
		expect(data.ActivityClass).toBe(TestActivity);
		expect(data.instances).toBe(instanceSet);
	});

	test("Reuses instances Set across reloads", async () => {
		class OldActivity extends Activity {
			static View = () => UI.Column();
		}

		const hot = createMockHot();
		registerActivityHMR(hot, OldActivity);

		const originalSet = (OldActivity.prototype as any)._$hotInstances;

		const newHot = simulateReload(hot);
		class NewActivity extends Activity {
			static View = () => UI.Row();
		}
		registerActivityHMR(newHot, NewActivity);
		await flushMicrotasks();

		// Same Set object should be reused
		const newSet = (NewActivity.prototype as any)._$hotInstances;
		expect(newSet).toBe(originalSet);
	});

	test("Updates prototype methods and static View on reload", async () => {
		const oldView = () => UI.Column();
		const newView = () => UI.Row();

		class OldActivity extends Activity {
			static View = oldView;
			getValue() {
				return "old";
			}
		}

		const hot = createMockHot();
		registerActivityHMR(hot, OldActivity);

		const newHot = simulateReload(hot);

		class NewActivity extends Activity {
			static View = newView;
			getValue() {
				return "new";
			}
		}
		registerActivityHMR(newHot, NewActivity);
		await flushMicrotasks();

		// Prototype method updated
		expect((OldActivity.prototype as any).getValue()).toBe("new");
		// Static View updated
		expect((OldActivity as any).View).toBe(newView);
	});

	test("Handles multiple consecutive reloads", async () => {
		class Activity1 extends Activity {
			static View = () => UI.Column();
		}

		const hot1 = createMockHot();
		registerActivityHMR(hot1, Activity1);
		const originalSet = (Activity1.prototype as any)._$hotInstances;

		// Second reload
		const hot2 = simulateReload(hot1);
		class Activity2 extends Activity {
			static View = () => UI.Row();
		}
		registerActivityHMR(hot2, Activity2);
		await flushMicrotasks();

		// Third reload
		const hot3 = simulateReload(hot2);
		class Activity3 extends Activity {
			static View = () => UI.Column();
		}
		registerActivityHMR(hot3, Activity3);
		await flushMicrotasks();

		// Same Set preserved across all reloads
		expect((Activity3.prototype as any)._$hotInstances).toBe(originalSet);
	});
});

describe("registerActivityHMR with Activity lifecycle", () => {
	test("Activity registers itself in instance set when activated", async () => {
		useTestContext();

		class TestActivity extends Activity {
			static View = () => UI.Column();
		}

		const hot = createMockHot();
		registerActivityHMR(hot, TestActivity);

		const activity = new TestActivity();
		app.addActivity(activity, true);

		await new Promise((r) => setTimeout(r, 10));

		const instanceSet = (TestActivity.prototype as any)
			._$hotInstances as Set<Activity>;
		expect(instanceSet.has(activity)).toBe(true);
	});

	test("Activity removes itself from instance set when unlinked", async () => {
		useTestContext();

		class TestActivity extends Activity {
			static View = () => UI.Column();
		}

		const hot = createMockHot();
		registerActivityHMR(hot, TestActivity);

		const activity = new TestActivity();
		app.addActivity(activity, true);

		await new Promise((r) => setTimeout(r, 10));

		const instanceSet = (TestActivity.prototype as any)
			._$hotInstances as Set<Activity>;
		expect(instanceSet.has(activity)).toBe(true);

		activity.unlink();

		expect(instanceSet.has(activity)).toBe(false);
	});

	test("Re-renders only active instances on reload", async () => {
		useTestContext();

		let viewCallCount = 0;
		class OldActivity extends Activity {
			static View = () => {
				viewCallCount++;
				return UI.Column();
			};
		}

		const hot = createMockHot();
		registerActivityHMR(hot, OldActivity);

		const activeActivity = new OldActivity();
		const inactiveActivity = new OldActivity();
		app.addActivity(activeActivity, true);
		app.addActivity(inactiveActivity, true);

		await new Promise((r) => setTimeout(r, 10));
		inactiveActivity.deactivate();

		const callCountBeforeReload = viewCallCount;

		const newHot = simulateReload(hot);
		class NewActivity extends Activity {
			static View = () => {
				viewCallCount++;
				return UI.Row();
			};
		}
		registerActivityHMR(newHot, NewActivity);
		await flushMicrotasks();

		// Only active instance should re-render (1 call, not 2)
		expect(viewCallCount).toBe(callCountBeforeReload + 1);
	});

	test("Preserves activity state across reloads", async () => {
		useTestContext();

		class OldActivity extends Activity {
			static View = () => UI.Column();
			counter = 0;
			increment() {
				this.counter++;
			}
		}

		const hot = createMockHot();
		registerActivityHMR(hot, OldActivity);

		const activity = new OldActivity();
		app.addActivity(activity, true);
		activity.increment();
		activity.increment();

		await new Promise((r) => setTimeout(r, 10));

		const newHot = simulateReload(hot);
		class NewActivity extends Activity {
			static View = () => UI.Row();
			counter = 0;
			increment() {
				this.counter += 10;
			}
		}
		registerActivityHMR(newHot, NewActivity);
		await flushMicrotasks();

		// State preserved, but new method used
		expect(activity.counter).toBe(2);
		activity.increment();
		expect(activity.counter).toBe(12);
	});

	test("Updates instances created from different class versions", async () => {
		useTestContext();

		let viewCallCount = 0;

		// Initial class and instance
		class Activity1 extends Activity {
			static View = () => {
				viewCallCount++;
				return UI.Column();
			};
			getValue() {
				return 1;
			}
		}

		const hot1 = createMockHot();
		registerActivityHMR(hot1, Activity1);

		const instance1 = new Activity1();
		app.addActivity(instance1, true);
		await new Promise((r) => setTimeout(r, 10));

		const initialViewCalls = viewCallCount;

		// First reload - creates Activity2
		const hot2 = simulateReload(hot1);
		class Activity2 extends Activity {
			static View = () => {
				viewCallCount++;
				return UI.Row();
			};
			getValue() {
				return 2;
			}
		}
		registerActivityHMR(hot2, Activity2);
		await flushMicrotasks();

		// instance1 should have been re-rendered
		expect(viewCallCount).toBe(initialViewCalls + 1);
		// instance1 now has updated method
		expect((instance1 as any).getValue()).toBe(2);

		// Create instance2 from Activity2 (the current class after reload)
		const instance2 = new Activity2();
		app.addActivity(instance2, true);
		await new Promise((r) => setTimeout(r, 10));

		const viewCallsBeforeSecondReload = viewCallCount;

		// Second reload - creates Activity3
		// This should update BOTH Activity1 AND Activity2
		const hot3 = simulateReload(hot2);
		class Activity3 extends Activity {
			static View = () => {
				viewCallCount++;
				return UI.Column();
			};
			getValue() {
				return 3;
			}
		}
		registerActivityHMR(hot3, Activity3);
		await flushMicrotasks();

		// BOTH instances should have been re-rendered (2 more calls)
		expect(viewCallCount).toBe(viewCallsBeforeSecondReload + 2);

		// Both instances should have the new method
		expect((instance1 as any).getValue()).toBe(3);
		expect((instance2 as any).getValue()).toBe(3);
	});

	test("Instances persist across multiple reloads", async () => {
		useTestContext();

		class Activity1 extends Activity {
			static View = () => UI.Column();
		}

		const hot1 = createMockHot();
		registerActivityHMR(hot1, Activity1);

		const activity = new Activity1();
		app.addActivity(activity, true);
		await new Promise((r) => setTimeout(r, 10));

		// First reload
		const hot2 = simulateReload(hot1);
		class Activity2 extends Activity {
			static View = () => UI.Row();
		}
		registerActivityHMR(hot2, Activity2);
		await flushMicrotasks();

		const set2 = (Activity2.prototype as any)._$hotInstances as Set<Activity>;
		expect(set2.has(activity)).toBe(true);

		// Second reload
		const hot3 = simulateReload(hot2);
		class Activity3 extends Activity {
			static View = () => UI.Column();
		}
		registerActivityHMR(hot3, Activity3);
		await flushMicrotasks();

		const set3 = (Activity3.prototype as any)._$hotInstances as Set<Activity>;
		expect(set3.has(activity)).toBe(true);
		// Same Set throughout
		expect(set3).toBe(set2);
	});
});
