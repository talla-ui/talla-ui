import {
	app,
	ActivationPath,
	Activity,
	ManagedList,
	ManagedObject,
} from "../../../dist/index.js";
import { describe, expect, test, useTestContext } from "@desk-framework/test";

describe("ActivationPath and ActivationContext", () => {
	describe("ActivationPath standalone", () => {
		test("Set, get path", () => {
			let p = new ActivationPath();
			p.path = "foo";
			expect(p.path).toBe("foo");
			p.path = "/bar/";
			expect(p.path).toBe("bar");
		});

		test("Set, get path undefined", () => {
			let p = new ActivationPath();
			p.path = "foo";
			p.path = undefined as any;
			expect(p.path).toBe("");
		});

		test("Match path: empty", () => {
			let p = new ActivationPath();
			expect(p.match("")).toBeDefined();
			expect(p.match("/")).toBeDefined();
			expect(p.match("/*x")).toBeUndefined();
			expect(p.match("/:x")).toBeUndefined();
		});

		test("Match path: single word", () => {
			let p = new ActivationPath();
			p.path = "foo";
			let m = p.match("foo");
			expect(m).toHaveProperty("path").toBe("foo");
			expect(p.match("foz")).toBeUndefined();
		});

		test("Match path: multiple words", () => {
			let p = new ActivationPath();
			p.path = "foo/bar/baz";
			let m = p.match("foo/bar/baz");
			expect(m).toHaveProperty("path").toBe("foo/bar/baz");
			let n = p.match("/foo/bar/baz");
			expect(n).toHaveProperty("path").toBe("foo/bar/baz");
			expect(p.match("foo/bar/box")).toBeUndefined();
			expect(p.match("foo/bar")).toBeUndefined();
			expect(p.match("foo/bar/baz/box")).toBeUndefined();
		});

		test("Match path: partial", () => {
			let p = new ActivationPath();
			p.path = "foo/bar/baz";
			let m = p.match("foo/bar/");
			expect(m).toHaveProperty("path").toBe("foo/bar/baz");
			expect(p.match("foo/")).toBeDefined();
			expect(p.match("/")).toBeDefined();
			expect(p.match("/foo/bar/baz/")).toBeDefined();
		});

		test("Match path: star", () => {
			let p = new ActivationPath();
			p.path = "foo/bar/baz";
			let m = p.match("foo/*x");
			expect(m).toHaveProperty("x").toBe("bar/baz");
			expect(p.match("/*y")).toHaveProperty("y").toBe("foo/bar/baz");
			expect(p.match("*z")).toHaveProperty("z").toBe("foo/bar/baz");
			expect(p.match("foo/*x/baz")).toBeUndefined(); // invalid
		});

		test("Match path: captures", () => {
			let p = new ActivationPath();
			p.path = "foo/bar/baz";
			let m = p.match("foo/:x/:y");
			expect(m).toHaveProperty("x").toBe("bar");
			expect(m).toHaveProperty("y").toBe("baz");
			expect(p.match("/:a/bar/baz")).toHaveProperty("a").toBe("foo");
			expect(p.match(":b/bar/baz")).toHaveProperty("b").toBe("foo");
			expect(p.match(":c/bar/")).toHaveProperty("c").toBe("foo");
			expect(p.match(":d/")).toHaveProperty("d").toBe("foo");
			expect(p.match("foo/:e/baz")).toHaveProperty("e").toBe("bar");
			expect(p.match("foo/:f/")).toHaveProperty("f").toBe("bar");
			expect(p.match("foo/bar/:g")).toHaveProperty("g").toBe("baz");
			expect(p.match("foo/bar/:h/")).toHaveProperty("h").toBe("baz");
			expect(p.match(":i/bar/box")).toBeUndefined();
			expect(p.match("foo/bar/baz/:j")).toBeUndefined();
			expect(p.match("foo/:k")).toBeUndefined();
		});

		test("Math parent path", () => {
			class MyActivity extends Activity {
				constructor() {
					super();
					this.observeAttach("child");
				}
				child?: MyActivity;
			}
			let p = new ActivationPath();
			p.path = "foo/bar/baz";
			let activity = new MyActivity();
			activity.child = new MyActivity();
			activity.path = "foo/bar";
			expect(p.match("./baz", activity.child)).toBeDefined();
		});

		test("Math multiple parent paths", () => {
			class MyActivity extends Activity {
				constructor() {
					super();
					this.observeAttach("child");
				}
				child?: MyActivity;
			}
			let p = new ActivationPath();
			p.path = "foo/bar/baz";
			let activity = new MyActivity();
			activity.child = new MyActivity();
			activity.child.child = new MyActivity();
			activity.path = "foo";
			activity.child.path = "./bar";
			expect(p.match("./:x", activity.child.child))
				.toHaveProperty("x")
				.toBe("baz");
		});
	});

	describe("ActivationContext and activities", (scope) => {
		scope.beforeEach(() => {
			useTestContext((options) => {
				options.pathDelay = 0;
			});
		});

		test("Singleton and properties", (t) => {
			expect(ManagedObject.whence(app.activities)).toBe(app);
			t.log("Checking root");
			expect(app.activities.root).toBeInstanceOf(ManagedList);
			expect(ManagedObject.whence(app.activities.root)).toBe(app.activities);
			t.log("Checking activationPath");
			expect(app.activities.activationPath).toBeInstanceOf(ActivationPath);
			expect(ManagedObject.whence(app.activities.activationPath)).toBe(
				app.activities
			);
		});

		test("Activity has activationPath reference", () => {
			let activity = new Activity();
			app.activities.root.add(activity);
			expect(activity)
				.toHaveProperty("activationPath")
				.toBe(app.activities.activationPath);
		});

		test("Activity path matches (async)", async () => {
			let activity = new Activity();
			activity.path = "foo";
			app.activities.activationPath.path = "foo";
			app.activities.root.add(activity);
			await Promise.resolve();
			expect(activity).toHaveProperty("pathMatch").toBeDefined();
		});

		test("Activity path matches when app path changed (async)", async () => {
			let activity = new Activity();
			activity.path = "foo";
			app.activities.activationPath.path = "bar";
			app.activities.root.add(activity);
			await Promise.resolve();
			expect(activity).toHaveProperty("pathMatch").toBeUndefined();
			app.activities.activationPath.path = "foo";
			await Promise.resolve();
			expect(activity).toHaveProperty("pathMatch").toBeDefined();
		});

		test("Path match handler called (async)", async (t) => {
			class MyActivity extends Activity {
				override path = "foo";
				override async handlePathMatchAsync(match?: ActivationPath.Match) {
					t.log("Match: ", match);
					t.count("handler");
				}
			}
			let activity = new MyActivity();
			app.activities.activationPath.path = "foo";
			app.activities.root.add(activity);
			await Promise.resolve();
			t.expectCount("handler").toBe(1);
		});

		test("Activity activated based on path", async (t) => {
			class MyActivity extends Activity {
				override path = "foo";
				protected override async beforeActiveAsync() {
					t.count("active");
				}
				protected override async beforeInactiveAsync() {
					t.count("inactive");
				}
			}
			let activity = new MyActivity();
			app.activities.root.add(activity);
			app.activities.activationPath.path = "foo";
			await t.sleep(1);
			t.expectCount("active").toBe(1);
			app.activities.activationPath.path = "bar";
			await t.sleep(1);
			t.expectCount("active").toBe(1);
			t.expectCount("inactive").toBe(1);
		});

		test("Quick path changes", async (t) => {
			class MyActivity extends Activity {
				override path = "foo";
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
			app.activities.root.add(activity);
			app.activities.activationPath.path = "foo";
			app.activities.activationPath.path = "bar";
			app.activities.activationPath.path = "foo";
			await t.sleep(50);
			t.expectCount("active").toBe(1);
			t.expectCount("inactive").toBe(0);

			// test cancellation:
			let error = await t.tryRunAsync(async () => {
				app.activities.activationPath.path = "bar";
				await t.sleep(1); // inactivate
				app.activities.activationPath.path = "foo";
				await t.sleep(1); // activate, cancelled!
				app.activities.activationPath.path = "bar";
				await t.sleep(20); // inactivate, skipped
			});
			t.expectCount("active").toBe(1);
			t.expectCount("inactive").toBe(1);
			expect(error)
				.asString()
				.toMatchRegExp(/cancelled/);
		});
	});
});
