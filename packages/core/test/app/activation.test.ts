import { useTestContext } from "@talla-ui/test-handler";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
	Activity,
	ActivityRouter,
	app,
	Binding,
	NavigationContext,
	ObservableObject,
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

	test("Resolve relative path", () => {
		p.set("users/123");
		expect(p.resolve("./detail")).toBe("users/123/detail");
		expect(p.resolve("other")).toBe("other");
	});

	test("Resolve relative path with ..", () => {
		p.set("users/123");
		expect(p.resolve("./detail/../info")).toBe("users/123/info");
	});

	test("Resolve relative path with multiple ..", () => {
		p.set("a/b/c");
		expect(p.resolve("../../top")).toBe("a/top");
	});

	test("Resolve relative path with trailing slash stripped", () => {
		p.set("foo");
		expect(p.resolve("./bar")).toBe("foo/bar");
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
		expect(app.activities.active.toArray()).toEqual([]);
		expect(app.activities.params).toEqual({});
		expect(app.activities.matchedRoute).toBe("");
		expect(app.navigation).toBeInstanceOf(NavigationContext);
	});

	test("Activity activated via route when added before path set", async () => {
		let activity = new Activity();
		app.addRoutes({ foo: activity });
		app.navigation?.set("foo");
		await expect
			.poll(() => activity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		expect(app.activities.active.get(0)).toBe(activity);
	});

	test("Activity router emits changes", async () => {
		let updated = 0;
		let activity = new Activity();
		activity.observe(new Binding("appContext.activities"), () => {
			updated++;
		});
		app.addRoutes({ foo: activity });
		expect(updated).toBe(2); // once for attaching, once for change
		app.addActivity(new Activity());
		expect(updated).toBe(3); // once for adding another activity
		app.navigation?.set("foo");
		await expect
			.poll(() => updated, { interval: 5, timeout: 100 })
			.toBeGreaterThanOrEqual(4); // activation
	});

	test("Activity not activated when route doesn't match", async () => {
		let activityFoo = new Activity();
		let activityBar = new Activity();
		app.addRoutes({ foo: activityFoo, bar: activityBar });
		app.navigation?.set("bar");
		await expect
			.poll(() => activityBar.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		expect(activityFoo.isActive()).toBeFalsy();
	});

	test("Activity activated when path matches route (async)", async () => {
		let activity = new Activity();
		app.addRoutes({ foo: activity });
		app.navigation?.set("bar");
		await expect
			.poll(() => !activity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		app.navigation?.set("foo");
		await expect
			.poll(() => activity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
	});

	test("Activity activated based on exact route pattern", async () => {
		let active = 0;
		let inactive = 0;
		class MyActivity extends Activity {
			protected override afterActive(signal: AbortSignal) {
				active++;
			}
			protected override afterInactive() {
				inactive++;
			}
		}
		let activity = new MyActivity();
		app.addRoutes({ foo: activity });
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

	test("Route with params", async () => {
		let activity = new Activity();
		app.addRoutes({ "users/:userId": activity });
		app.navigation?.set("users/123");
		await expect
			.poll(() => activity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		expect(app.activities.params.userId).toBe("123");

		// change params
		app.navigation?.set("users/456");
		await expect
			.poll(() => app.activities.params.userId === "456", {
				interval: 5,
				timeout: 100,
			})
			.toBe(true);
	});

	test("Route with factory function", async () => {
		let created: Activity[] = [];
		app.addRoutes({
			"items/:itemId": ({ itemId }) => {
				let a = new Activity();
				(a as any).itemId = itemId;
				created.push(a);
				return a;
			},
		});

		app.navigation?.set("items/abc");
		await expect
			.poll(() => created.length === 1, { interval: 5, timeout: 100 })
			.toBe(true);
		expect((created[0] as any).itemId).toBe("abc");
		expect(created[0]!.isActive()).toBe(true);

		// navigate to different item — old factory activity should be unlinked
		app.navigation?.set("items/def");
		await expect
			.poll(() => created.length === 2, { interval: 5, timeout: 100 })
			.toBe(true);
		expect(created[0]!.isUnlinked()).toBe(true);
		expect(created[1]!.isActive()).toBe(true);
		expect((created[1] as any).itemId).toBe("def");
	});

	test("Factory function may return undefined to skip route activation", async () => {
		let created: Activity[] = [];
		app.addRoutes({
			"items/:itemId": ({ itemId }) => {
				if (itemId === "missing") return undefined as any;
				let a = new Activity();
				(a as any).itemId = itemId;
				created.push(a);
				return a;
			},
		});

		app.navigation?.set("items/abc");
		await expect
			.poll(() => created.length === 1, { interval: 5, timeout: 100 })
			.toBe(true);
		expect((created[0] as any).itemId).toBe("abc");
		expect(created[0]!.isActive()).toBe(true);

		app.navigation?.set("items/missing");
		await expect
			.poll(() => created[0]!.isUnlinked(), { interval: 5, timeout: 100 })
			.toBe(true);
		expect(app.activities.params.itemId).toBe("missing");
		expect(app.activities.active.length).toBe(0);
	});

	test("Factory function may omit return to skip route activation", async () => {
		let created: Activity[] = [];
		app.addRoutes({
			"items/:itemId": ({ itemId }) => {
				if (itemId === "missing") return;
				let a = new Activity();
				(a as any).itemId = itemId;
				created.push(a);
				return a;
			},
		});

		app.navigation?.set("items/abc");
		await expect
			.poll(() => created.length === 1, { interval: 5, timeout: 100 })
			.toBe(true);
		expect((created[0] as any).itemId).toBe("abc");
		expect(created[0]!.isActive()).toBe(true);

		app.navigation?.set("items/missing");
		await expect
			.poll(() => created[0]!.isUnlinked(), { interval: 5, timeout: 100 })
			.toBe(true);
		expect(app.activities.params.itemId).toBe("missing");
		expect(app.activities.active.length).toBe(0);
	});

	test("Undefined in mixed ref and factory route leaves shared activity active", async () => {
		let listActivity = new Activity();
		app.addRoutes({
			users: listActivity,
			"users/:userId": [
				listActivity,
				({ userId }) => {
					if (userId === "missing") return undefined as any;
					let a = new Activity();
					(a as any).userId = userId;
					return a;
				},
			],
		});

		app.navigation?.set("users");
		await expect
			.poll(() => listActivity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		expect(app.activities.active.length).toBe(1);

		app.navigation?.set("users/missing");
		// Wait for routing to complete: params should have userId from the matched route
		await expect
			.poll(() => app.activities.params.userId, {
				interval: 5,
				timeout: 100,
			})
			.toBe("missing");
		// Factory returned undefined, so only the shared ref activity remains active
		expect(app.activities.active.length).toBe(1);
		expect(listActivity.isActive()).toBe(true);
		expect(app.activities.active.get(0)).toBe(listActivity);
	});

	test("Route with mixed ref and factory", async () => {
		let listActivity = new Activity();
		let detailCreated: Activity[] = [];
		app.addRoutes({
			users: listActivity,
			"users/:userId": [
				listActivity,
				({ userId }) => {
					let a = new Activity();
					(a as any).userId = userId;
					detailCreated.push(a);
					return a;
				},
			],
		});

		// navigate to list
		app.navigation?.set("users");
		await expect
			.poll(() => listActivity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		expect(app.activities.active.length).toBe(1);

		// navigate to detail — list stays active (shared ref), detail added
		app.navigation?.set("users/42");
		await expect
			.poll(() => detailCreated.length === 1, { interval: 5, timeout: 100 })
			.toBe(true);
		expect(listActivity.isActive()).toBe(true); // still active (no flicker)
		expect(detailCreated[0]!.isActive()).toBe(true);
		expect(app.activities.active.length).toBe(2);

		// navigate back to list — detail unlinked, list stays
		app.navigation?.set("users");
		await expect
			.poll(() => detailCreated[0]!.isUnlinked(), {
				interval: 5,
				timeout: 100,
			})
			.toBe(true);
		expect(listActivity.isActive()).toBe(true);
		expect(app.activities.active.length).toBe(1);
	});

	test("Active list observable for list-detail pattern", async () => {
		let listActivity = new Activity();
		let activeChanges = 0;
		app.activities.active.listen(() => {
			activeChanges++;
		});

		app.addRoutes({
			users: listActivity,
			"users/:userId": [listActivity, () => new Activity()],
		});

		app.navigation?.set("users");
		await expect
			.poll(() => listActivity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		let changesAfterList = activeChanges;
		expect(changesAfterList).toBeGreaterThan(0);

		app.navigation?.set("users/1");
		await expect
			.poll(() => app.activities.active.length === 2, {
				interval: 5,
				timeout: 100,
			})
			.toBe(true);
		expect(activeChanges).toBeGreaterThan(changesAfterList);
	});

	test("Quick path changes", async () => {
		let active = 0;
		let inactive = 0;
		class MyFooActivity extends Activity {
			protected override async afterActive(signal: AbortSignal) {
				await new Promise((r) => setTimeout(r, 20));
				if (!signal.aborted) {
					active++;
				}
			}
			protected override async afterInactive() {
				await new Promise((r) => setTimeout(r, 20));
				inactive++;
			}
		}

		let fooActivity = new MyFooActivity();
		let barActivity = new Activity();
		app.addRoutes({ foo: fooActivity, bar: barActivity });

		// synchronous changes: only final state matters
		app.navigation?.set("foo");
		app.navigation?.set("bar");
		app.navigation?.set("foo");
		await expect.poll(() => active, { interval: 5, timeout: 200 }).toBe(1);
		expect(inactive).toBe(0);

		// reset for async test
		active = 0;
		inactive = 0;

		// async changes with time for each to complete
		app.navigation?.set("bar");
		await expect.poll(() => inactive, { interval: 5, timeout: 200 }).toBe(1);
		app.navigation?.set("foo");
		await expect.poll(() => active, { interval: 5, timeout: 200 }).toBe(1);
	});

	test("Root route matches empty path", async () => {
		let activity = new Activity();
		app.addRoutes({ "": activity });
		app.navigation?.set("");
		await expect
			.poll(() => activity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
	});

	test("No match deactivates previously matched route activities", async () => {
		let activity = new Activity();
		app.addRoutes({ foo: activity });
		app.navigation?.set("foo");
		await expect
			.poll(() => activity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		app.navigation?.set("nonexistent");
		await expect
			.poll(() => !activity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
	});

	test("Route with multiple params", async () => {
		let activity = new Activity();
		app.addRoutes({ "users/:userId/posts/:postId": activity });

		app.navigation?.set("users/42/posts/7");
		await expect
			.poll(() => activity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		expect(app.activities.params.userId).toBe("42");
		expect(app.activities.params.postId).toBe("7");

		// should not match wrong segment count
		app.navigation?.set("users/42");
		await expect
			.poll(() => !activity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
	});

	test("First matching route wins", async () => {
		let specificActivity = new Activity();
		let paramActivity = new Activity();
		// register specific route first
		app.addRoutes({
			"users/admin": specificActivity,
			"users/:userId": paramActivity,
		});

		app.navigation?.set("users/admin");
		await expect
			.poll(() => specificActivity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		expect(paramActivity.isActive()).toBe(false);

		// non-admin path should match second route
		app.navigation?.set("users/123");
		await expect
			.poll(() => paramActivity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		expect(specificActivity.isActive()).toBe(false);
	});

	test("Params cleared when route without params matches", async () => {
		let paramActivity = new Activity();
		let plainActivity = new Activity();
		app.addRoutes({
			"users/:userId": paramActivity,
			settings: plainActivity,
		});

		// match parameterized route
		app.navigation?.set("users/123");
		await expect
			.poll(() => paramActivity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		expect(app.activities.params.userId).toBe("123");

		// switch to non-parameterized route — params should be cleared
		app.navigation?.set("settings");
		await expect
			.poll(() => plainActivity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		expect(app.activities.params.userId).toBeUndefined();
		expect(Object.keys(app.activities.params)).toEqual([]);
	});

	test("Params cleared when no route matches", async () => {
		let activity = new Activity();
		app.addRoutes({ "users/:userId": activity });

		app.navigation?.set("users/123");
		await expect
			.poll(() => activity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		expect(app.activities.params.userId).toBe("123");

		app.navigation?.set("nonexistent");
		await expect
			.poll(() => !activity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		expect(app.activities.params.userId).toBeUndefined();
	});

	test("Active list cleared when no route matches", async () => {
		let activity = new Activity();
		app.addRoutes({ foo: activity });
		app.navigation?.set("foo");
		await expect
			.poll(() => activity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		expect(app.activities.active.length).toBe(1);

		app.navigation?.set("nonexistent");
		await expect
			.poll(() => !activity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		expect(app.activities.active.length).toBe(0);
	});

	test("Route pattern validation rejects invalid patterns", () => {
		let a = new Activity();
		expect(() => app.activities.route("/leading", a)).toThrowError();
		expect(() => app.activities.route("trailing/", a)).toThrowError();
		expect(() => app.activities.route("double//slash", a)).toThrowError();
		expect(() => app.activities.route("./relative", a)).toThrowError();
		expect(() => app.activities.route("foo/./bar", a)).toThrowError();
		expect(() => app.activities.route("foo/../bar", a)).toThrowError();
		expect(() => app.activities.route(":", a)).toThrowError();
		expect(() => app.activities.route("foo/*/bar", a)).toThrowError();
	});

	test("Route requires at least one activity or factory arg", () => {
		expect(() => app.activities.route("foo")).toThrowError();
	});

	test("Valid route patterns accepted", () => {
		let a = new Activity();
		expect(() => app.activities.route("", a)).not.toThrowError();
		expect(() => app.activities.route("foo", a)).not.toThrowError();
		expect(() => app.activities.route(":id", a)).not.toThrowError();
		expect(() => app.activities.route("foo/bar", a)).not.toThrowError();
		expect(() => app.activities.route("foo/:bar/:id", a)).not.toThrowError();
		expect(() => app.activities.route("users/:userId", a)).not.toThrowError();
		expect(() => app.activities.route("a/:b/c/:d", a)).not.toThrowError();
		expect(() => app.activities.route("*", a)).not.toThrowError();
		expect(() => app.activities.route("files/*", a)).not.toThrowError();
	});

	test("Root, wildcard, and parameter route patterns match expected paths", async () => {
		let rootActivity = new Activity();
		let staticActivity = new Activity();
		let rootParamActivity = new Activity();
		let nestedParamActivity = new Activity();
		let wildcardActivity = new Activity();
		app.addRoutes({
			"": rootActivity,
			foo: staticActivity,
			":id": rootParamActivity,
			"foo/:bar/:id": nestedParamActivity,
			"*": wildcardActivity,
		});

		// empty path matches only the root route
		app.navigation?.set("");
		await expect
			.poll(() => rootActivity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		expect(staticActivity.isActive()).toBe(false);
		expect(rootParamActivity.isActive()).toBe(false);
		expect(nestedParamActivity.isActive()).toBe(false);
		expect(wildcardActivity.isActive()).toBe(false);
		expect(app.activities.params).toEqual({});
		expect(app.activities.matchedRoute).toBe("");

		// exact static route should win over a root-level param route
		app.navigation?.set("foo");
		await expect
			.poll(() => staticActivity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		expect(rootActivity.isActive()).toBe(false);
		expect(rootParamActivity.isActive()).toBe(false);
		expect(nestedParamActivity.isActive()).toBe(false);
		expect(wildcardActivity.isActive()).toBe(false);
		expect(app.activities.params).toEqual({});
		expect(app.activities.matchedRoute).toBe("foo");

		// a single root-level segment should match :id
		app.navigation?.set("123");
		await expect
			.poll(() => rootParamActivity.isActive(), {
				interval: 5,
				timeout: 100,
			})
			.toBe(true);
		expect(rootActivity.isActive()).toBe(false);
		expect(staticActivity.isActive()).toBe(false);
		expect(nestedParamActivity.isActive()).toBe(false);
		expect(wildcardActivity.isActive()).toBe(false);
		expect(app.activities.params.id).toBe("123");
		expect(app.activities.matchedRoute).toBe(":id");

		// multiple params should align by segment position
		app.navigation?.set("foo/x/42");
		await expect
			.poll(() => nestedParamActivity.isActive(), {
				interval: 5,
				timeout: 100,
			})
			.toBe(true);
		expect(rootActivity.isActive()).toBe(false);
		expect(staticActivity.isActive()).toBe(false);
		expect(rootParamActivity.isActive()).toBe(false);
		expect(wildcardActivity.isActive()).toBe(false);
		expect(app.activities.params.bar).toBe("x");
		expect(app.activities.params.id).toBe("42");
		expect(app.activities.matchedRoute).toBe("foo/:bar/:id");

		// any unmatched path should fall through to the catch-all route
		app.navigation?.set("foo/bar/baz/qux");
		await expect
			.poll(() => wildcardActivity.isActive(), {
				interval: 5,
				timeout: 100,
			})
			.toBe(true);
		expect(rootActivity.isActive()).toBe(false);
		expect(staticActivity.isActive()).toBe(false);
		expect(rootParamActivity.isActive()).toBe(false);
		expect(nestedParamActivity.isActive()).toBe(false);
		expect(app.activities.params.path).toBe("foo/bar/baz/qux");
		expect(app.activities.matchedRoute).toBe("*");
	});

	test("Wildcard catch-all matches root when no other route", async () => {
		let activity = new Activity();
		app.addRoutes({ "*": activity });
		app.navigation?.set("");
		await expect
			.poll(() => activity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		// root match captures an empty remaining path
		expect(app.activities.params.path).toBe("");
	});

	test("Prefix wildcard captures remaining path", async () => {
		let filesActivity = new Activity();
		let homeActivity = new Activity();
		app.addRoutes({
			"": homeActivity,
			"files/*": filesActivity,
		});

		app.navigation?.set("files/docs/readme.md");
		await expect
			.poll(() => filesActivity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		expect(app.activities.params.path).toBe("docs/readme.md");

		// "files" alone should not match "files/*"
		app.navigation?.set("files");
		await expect
			.poll(() => !filesActivity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
	});

	test("Prefix wildcard with params", async () => {
		let activity = new Activity();
		app.addRoutes({ "repo/:owner/*": activity });

		app.navigation?.set("repo/acme/src/main.ts");
		await expect
			.poll(() => activity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		expect(app.activities.params.owner).toBe("acme");
		expect(app.activities.params.path).toBe("src/main.ts");
	});

	test("Same path navigation does not deactivate/reactivate", async () => {
		let activations = 0;
		let deactivations = 0;
		class MyActivity extends Activity {
			protected override afterActive() {
				activations++;
			}
			protected override afterInactive() {
				deactivations++;
			}
		}
		let activity = new MyActivity();
		app.addRoutes({ foo: activity });

		app.navigation?.set("foo");
		await expect
			.poll(() => activations === 1, { interval: 5, timeout: 100 })
			.toBe(true);

		// navigate to same path again — should not deactivate/reactivate
		app.navigation?.set("foo");
		await new Promise((r) => setTimeout(r, 50));
		expect(activations).toBe(1);
		expect(deactivations).toBe(0);
		expect(activity.isActive()).toBe(true);
	});

	test("First param route wins when multiple param routes match", async () => {
		let route1 = new Activity();
		let route2 = new Activity();
		app.addRoutes({
			"items/:type": route1,
			"items/:id": route2,
		});
		app.navigation?.set("items/123");
		await expect
			.poll(() => route1.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		expect(route2.isActive()).toBe(false);
	});

	test("Params object is replaced, not mutated (no stale refs)", async () => {
		let activity = new Activity();
		app.addRoutes({
			"users/:userId": activity,
			settings: activity,
		});
		app.navigation?.set("users/123");
		await expect
			.poll(() => activity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		let oldParams = app.activities.params;
		expect(oldParams.userId).toBe("123");

		// navigate to different route — old params ref should be stale
		app.navigation?.set("settings");
		await expect
			.poll(() => app.activities.params !== oldParams, {
				interval: 5,
				timeout: 100,
			})
			.toBe(true);
		expect(oldParams.userId).toBe("123"); // old ref unchanged
		expect(app.activities.params.userId).toBeUndefined(); // new ref clean
	});

	test("Clear removes all activities and route registrations", async () => {
		let activity = new Activity();
		app.addRoutes({ foo: activity });
		app.navigation?.set("foo");
		await expect
			.poll(() => activity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);

		app.activities.clear();
		expect(activity.isUnlinked()).toBe(true);
		expect(app.activities.active.length).toBe(0);
		expect(app.activities.params).toEqual({});
		expect(app.activities.matchedRoute).toBe("");

		// routes should also be cleared — navigating won't match
		let newActivity = new Activity();
		app.addActivity(newActivity);
		app.navigation?.set("foo");
		await new Promise((r) => setTimeout(r, 50));
		expect(newActivity.isActive()).toBe(false);
	});

	test("Factory function error rejects routeAsync", async () => {
		app.activities.route("boom", () => {
			throw new Error("factory boom");
		});
		await expect(app.activities.routeAsync("boom")).rejects.toThrow(
			"factory boom",
		);
	});

	test("isEmpty returns true when no activities or routes", () => {
		expect(app.activities.isEmpty()).toBe(true);
		let a = new Activity();
		app.addActivity(a);
		expect(app.activities.isEmpty()).toBe(false);
		app.activities.clear();
		expect(app.activities.isEmpty()).toBe(true);
		// routes also count
		app.activities.route("foo", new Activity());
		expect(app.activities.isEmpty()).toBe(false);
	});

	test("Concurrent routeAsync calls: only the last one takes effect", async () => {
		let activations: string[] = [];
		class TaggedActivity extends Activity {
			constructor(public tag: string) {
				super();
			}
			protected override afterActive() {
				activations.push(this.tag);
			}
		}
		let a = new TaggedActivity("a");
		let b = new TaggedActivity("b");
		app.activities.route("a", a);
		app.activities.route("b", b);

		// fire two routeAsync calls without awaiting the first
		let p1 = app.activities.routeAsync("a");
		let p2 = app.activities.routeAsync("b");
		await Promise.all([p1, p2]);

		// only the second route should be active
		expect(b.isActive()).toBe(true);
		expect(a.isActive()).toBe(false);
	});

	test("routeAsync bails out when router is unlinked mid-route", async () => {
		let factory = () => new Activity();
		let router = new ActivityRouter();
		router.route("foo", factory);

		// unlink the router, then try to route
		router.unlink();
		let result = await router.routeAsync("foo");
		expect(result).toBeUndefined();
	});

	test("Ref activity not unlinked when route deactivates", async () => {
		let activity = new Activity();
		app.addRoutes({ foo: activity });
		app.navigation?.set("foo");
		await expect
			.poll(() => activity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		app.navigation?.set("bar");
		await expect
			.poll(() => !activity.isActive(), { interval: 5, timeout: 100 })
			.toBe(true);
		expect(activity.isUnlinked()).toBe(false); // still in ownership list
	});
});

describe("Activity.showDialogAsync", () => {
	beforeEach(() => {
		useTestContext((options) => {
			options.navigationDelay = 0;
		});
	});

	class DialogActivity extends Activity {
		confirmed = false;
	}

	class ParentActivity extends Activity {
		async doShowDialog() {
			return this.showDialogAsync(new DialogActivity());
		}
	}

	test("Dialog is activated and attached to parent", async () => {
		let parent = new ParentActivity();
		app.addActivity(parent, true);
		let dialog = new DialogActivity();
		let p = parent.showDialogAsync(dialog);
		expect(dialog.isActive()).toBe(true);
		expect(ObservableObject.whence(dialog)).toBe(parent);
		dialog.unlink();
		await p;
	});

	test("Promise resolves with dialog after unlink", async () => {
		let parent = new ParentActivity();
		app.addActivity(parent, true);
		let dialog = new DialogActivity();
		let p = parent.showDialogAsync(dialog);
		dialog.confirmed = true;
		dialog.unlink();
		let result = await p;
		expect(result).toBe(dialog);
		expect(result.confirmed).toBe(true);
	});

	test("Dialog is auto-unlinked when parent deactivates", async () => {
		let parent = new ParentActivity();
		app.addActivity(parent, true);
		let dialog = new DialogActivity();
		let p = parent.showDialogAsync(dialog);
		expect(dialog.isActive()).toBe(true);
		parent.deactivate();
		let result = await p;
		expect(result).toBe(dialog);
		expect(dialog.isUnlinked()).toBe(true);
	});

	test("Dialog can override render mode in afterActive", async () => {
		let renderModeSet = "";
		class CustomDialog extends Activity {
			protected override afterActive() {
				this.setRenderMode("page");
				renderModeSet = "page";
			}
		}
		let parent = new ParentActivity();
		app.addActivity(parent, true);
		let dialog = new CustomDialog();
		let p = parent.showDialogAsync(dialog);
		await expect
			.poll(() => renderModeSet, { interval: 5, timeout: 100 })
			.toBe("page");
		dialog.unlink();
		await p;
	});

	test("Multiple concurrent dialogs work independently", async () => {
		let parent = new ParentActivity();
		app.addActivity(parent, true);
		let dialog1 = new DialogActivity();
		let dialog2 = new DialogActivity();
		let p1 = parent.showDialogAsync(dialog1);
		let p2 = parent.showDialogAsync(dialog2);
		expect(dialog1.isActive()).toBe(true);
		expect(dialog2.isActive()).toBe(true);

		dialog1.confirmed = true;
		dialog1.unlink();
		let r1 = await p1;
		expect(r1.confirmed).toBe(true);
		expect(dialog2.isActive()).toBe(true);

		dialog2.unlink();
		let r2 = await p2;
		expect(r2.confirmed).toBe(false);
	});
});
