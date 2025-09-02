import {
	clickOutputAsync,
	expectOutputAsync,
	useTestContext,
} from "@talla-ui/test-handler";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
	Activity,
	app,
	AppContext,
	ObservableObject,
	NavigationContext,
	UI,
	Binding,
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

	test("Activity context Object and properties", () => {
		expect(ObservableObject.whence(app.activities)).toBe(app);
		expect(app.activities.toArray()).toEqual([]);
		expect(app.activities.length).toBe(0);
		expect(app.navigation).toBeInstanceOf(NavigationContext);
	});

	test("Activity activated when added", async () => {
		let activity = new Activity();
		activity.navigationPath = "foo";
		app.navigation?.set("foo");
		app.addActivity(activity);
		expect(app.activities.length).toBe(1);
		await new Promise((r) => setTimeout(r, 1));
		expect(activity.isActive()).toBeTruthy();
		expect(app.navigation?.matchedPath).toBe("foo");
		expect(activity.isActive()).toBe(true);
	});

	test("Activity not activated when added", async () => {
		let activityFoo = new Activity();
		activityFoo.navigationPath = "foo";
		let activityBar = new Activity();
		activityBar.navigationPath = "bar";
		app.navigation?.set("bar");
		app.addActivity(activityFoo);
		app.addActivity(activityBar);
		await new Promise((r) => setTimeout(r, 1));
		expect(activityFoo.isActive()).toBeFalsy();
		expect(activityBar.isActive()).toBeTruthy();
		for (let a of app.activities) {
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
		await new Promise((r) => setTimeout(r, 1));
		expect(activity.isActive()).toBeFalsy();
		app.navigation?.set("foo");
		await new Promise((r) => setTimeout(r, 1));
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
		await new Promise((r) => setTimeout(r, 1));
		expect(active).toBe(1);
		app.navigation?.set("bar");
		await new Promise((r) => setTimeout(r, 1));
		app.navigation?.set("foo/bar");
		await new Promise((r) => setTimeout(r, 1));
		expect(active).toBe(1);
		expect(inactive).toBe(1);
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
			override navigationPath = "foo";
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
		app.navigation?.set("foo");
		console.log("Setting path synchronously: bar");
		app.navigation?.set("bar");
		console.log("Setting path synchronously: foo");
		app.navigation?.set("foo");
		console.log("Waiting...");
		await new Promise((r) => setTimeout(r, 50));
		expect(active).toBe(1);
		expect(inactive).toBe(0);

		// test cancellation:
		console.log("Setting path asynchronously: bar");
		app.navigation?.set("bar");
		await new Promise((r) => setTimeout(r, 1)); // inactivate
		console.log("Setting path asynchronously: foo");
		app.navigation?.set("foo");
		await new Promise((r) => setTimeout(r, 1)); // activate, cancelled!
		console.log("Setting path asynchronously: bar");
		app.navigation?.set("bar");
		await new Promise((r) => setTimeout(r, 20)); // inactivate, skipped
		expect(active).toBe(1);
		await new Promise((r) => setTimeout(r, 50));
		expect(inactive).toBe(1);
		expect(errored).toBe(1);
	});
});

describe("attachActivityAsync method", () => {
	beforeEach(() => {
		useTestContext({ navigationDelay: 0 });
	});

	class MyActivity extends Activity {
		static override View(v: Binding<MyActivity>) {
			return UI.Label(v.bind("label"));
		}
		label?: string;
		toAttach?: Activity;
		attachedClicked?: boolean;
		createAttached() {
			return (this.toAttach = this.attach(new MyActivity()));
		}
		async onClick() {
			console.log("showing activity", this.toAttach?.isUnlinked());
			let a = await this.attachActivityAsync(this.toAttach as any);
			for await (let e of a.listenAsync()) {
				if (e.name === "Click") this.attachedClicked = true;
			}
		}
	}

	test("Basic functionality", async () => {
		let activity = new MyActivity();
		activity.label = "Parent";
		let subActivity = new MyActivity();
		subActivity.label = "Sub";
		activity.toAttach = subActivity;
		app.addActivity(activity, true);
		await clickOutputAsync({ text: "Parent" });
		// ... this should show the sub activity
		await expectOutputAsync({ text: "Sub" });
	});

	test("Deactivate sub activity when parent is deactivated", async () => {
		let activity = new MyActivity();
		activity.label = "Parent";
		let subActivity = new MyActivity();
		subActivity.label = "Sub";
		activity.toAttach = subActivity;
		app.addActivity(activity, true);
		await clickOutputAsync({ text: "Parent" });
		// ... this should show the sub activity
		await expectOutputAsync({ text: "Sub" });
		await activity.deactivateAsync();
		// ... the sub activity should be unlinked
		expect(subActivity.isUnlinked()).toBe(true);
	});

	test("Can show an activity that's already attached", async () => {
		let activity = new MyActivity();
		activity.label = "Parent";
		let activity2 = new MyActivity();
		let subActivity = activity2.createAttached();
		activity.toAttach = subActivity;
		subActivity.label = "Attached";
		app.addActivity(activity, true);
		await clickOutputAsync({ text: "Parent" });
		// ... this should still show the sub activity
		await expectOutputAsync({ text: "Attached" });
		// ... and unlink it when the parent is deactivated
		expect(subActivity.isUnlinked()).toBe(false);
		await activity.deactivateAsync();
		expect(subActivity.isUnlinked()).toBe(true);
	});

	test("Fails when either activity is unlinked", async () => {
		let activity = new MyActivity();
		activity.label = "Parent";
		let subActivity = activity.createAttached();
		subActivity.unlink();
		app.addActivity(activity, true);
		await expect(() => activity.onClick()).rejects.toThrowError("unlinked");
		activity.toAttach = new MyActivity();
		activity.unlink();
		await expect(() => activity.onClick()).rejects.toThrowError("unlinked");
	});
});

describe("Path match using method and sub activities", () => {
	test("Sub path match", async () => {
		let remainders: string[] = [];
		class MyActivity extends Activity {
			override navigationPath = "foo";
			override matchNavigationPath(remainder: string) {
				remainders.push(remainder);
				return true;
			}
		}
		let activity = new MyActivity();
		app.addActivity(activity);
		app.navigation?.set("foo");
		await new Promise((r) => setTimeout(r, 1));
		expect(activity.isActive()).toBe(true);
		app.navigation?.set("foo/bar");
		await new Promise((r) => setTimeout(r, 1));
		expect(activity.isActive()).toBe(true);
		app.navigation?.set("foo/bar/baz");
		await new Promise((r) => setTimeout(r, 1));
		expect(activity.isActive()).toBe(true);
		app.navigation?.set("boo");
		await new Promise((r) => setTimeout(r, 1));
		expect(activity.isActive()).toBe(false);
		expect(remainders).toEqual(["", "bar", "bar/baz"]);
	});

	test("Specific path match using blank path prefix", async () => {
		class MyActivity extends Activity {
			override navigationPath = "";
			override matchNavigationPath(remainder: string) {
				return remainder === "foo";
			}
		}
		let activity = new MyActivity();
		app.addActivity(activity);
		app.navigation?.set("");
		await new Promise((r) => setTimeout(r, 1));
		expect(activity.isActive()).toBe(false);
		app.navigation?.set("foo");
		await new Promise((r) => setTimeout(r, 1));
		expect(activity.isActive()).toBe(true);
		app.navigation?.set("bar");
		await new Promise((r) => setTimeout(r, 1));
		expect(activity.isActive()).toBe(false);
	});

	test("Path match using method and sub activity", async () => {
		class MySubActivity extends Activity {
			sub = true;
		}
		class MyActivity extends Activity {
			override navigationPath = "foo";
			override matchNavigationPath(remainder: string) {
				if (!remainder) return true;
				if (remainder === "bar") {
					this.subActivity = new MySubActivity();
					return this.subActivity;
				}
			}
			subActivity?: MySubActivity;
		}
		let activity = new MyActivity();
		app.addActivity(activity);

		// exact match: active, but no sub activity
		app.navigation?.set("foo");
		await new Promise((r) => setTimeout(r, 1));
		expect(activity.isActive()).toBe(true);
		expect(activity.subActivity).toBeUndefined();

		// sub path match: active, sub activity active
		app.navigation?.set("foo/bar");
		await new Promise((r) => setTimeout(r, 1));
		expect(activity.isActive()).toBe(true);
		expect(activity.subActivity?.isActive()).toBe(true);

		// no match: inactive, sub activity unlinked
		app.navigation?.set("bar");
		await new Promise((r) => setTimeout(r, 1));
		expect(activity.isActive()).toBe(false);
		expect(activity.subActivity?.isUnlinked()).toBe(true);
	});
});
