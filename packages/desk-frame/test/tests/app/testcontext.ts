import {
	describe,
	test,
	expect,
	useTestContext,
	TestRenderer,
} from "@desk-framework/test";
import { TestActivationPath } from "@desk-framework/test";
import {
	UICell,
	app,
	PageViewActivity,
	ManagedEvent,
	ManagedObject,
	UIPrimaryButton,
	ViewComposite,
} from "../../../dist/index.js";

describe("TestContext", () => {
	test("useTestContext result", (t) => {
		t.breakOnFail();
		let app = useTestContext();
		expect(app.renderer).toBeInstanceOf(TestRenderer);
		expect(app.activities.activationPath).toBeInstanceOf(TestActivationPath);
	});

	describe("Activation paths", () => {
		test("Initial path: default", () => {
			let app = useTestContext();
			expect(app.getPath()).toBe("");
		});

		test("Initial path: set in options", () => {
			let app = useTestContext((options) => {
				options.path = "/foo";
			});
			expect(app.getPath()).toBe("foo");
		});

		test("Navigation history: set once", async () => {
			let app = useTestContext((options) => {
				options.path = "foo";
			});
			let path = app.activities.activationPath;
			await path.navigateAsync("bar");
			expect(path.getHistory()).toBeArray(["foo", "foo/bar"]);
		});

		test("Navigation history: set, replace", async () => {
			let app = useTestContext((options) => {
				options.path = "foo";
			});
			let path = app.activities.activationPath;
			await path.navigateAsync("bar");
			await path.navigateAsync("baz", { replace: true });
			expect(path.getHistory()).toBeArray(["foo", "foo/bar/baz"]);
		});

		test("Navigation history: back", async () => {
			let app = useTestContext((options) => {
				options.path = "foo";
			});
			let path = app.activities.activationPath;
			await path.navigateAsync("bar");
			await path.navigateAsync("", { back: true });
			expect(path.getHistory()).toBeArray(["foo"]);
		});

		test("Navigation history: back twice", async (t) => {
			let app = useTestContext((options) => {
				options.path = "foo";
			});
			app.navigate("bar");
			await t.expectPathAsync(100, "foo/bar");
			app.navigate("/baz");
			await t.expectPathAsync(100, "baz");
			app.navigate(":back", { back: true });
			await t.expectPathAsync(100, "foo");
		});

		test("Navigation history: back using goBack() sync", async (t) => {
			let app = useTestContext((options) => {
				options.path = "foo";
				options.pathDelay = 0;
			});
			let path = app.activities.activationPath;
			await path.navigateAsync("bar");
			app.goBack();
			await t.expectPathAsync(100, "foo");
			expect(path.getHistory()).toBeArray(["foo"]);
		});

		test("Navigation history: back, set", async () => {
			let app = useTestContext((options) => {
				options.path = "foo";
			});
			let path = app.activities.activationPath;
			await path.navigateAsync("bar");
			await path.navigateAsync("baz", { back: true });
			expect(path.getHistory()).toBeArray(["foo", "foo/baz"]);
		});

		test("Navigation history: back, error if app would exit", async () => {
			let app = useTestContext((options) => {
				options.path = "foo";
			});
			let path = app.activities.activationPath;
			await expect(async () =>
				path.navigateAsync("", { back: true })
			).toThrowErrorAsync();
		});

		test("Navigate to relative path", async () => {
			let app = useTestContext();
			let path = app.activities.activationPath;
			await path.navigateAsync("bar");
			await path.navigateAsync("./baz");
			expect(path.getHistory()).toBeArray(["", "bar", "bar/baz"]);
			path.clear();
			await path.navigateAsync("bar");
			await path.navigateAsync("../baz");
			expect(path.getHistory()).toBeArray(["", "bar", "baz"]);
			path.clear();
			await path.navigateAsync("bar/baz/123");
			await path.navigateAsync("../../../xyz");
			expect(path.getHistory()).toBeArray(["", "bar/baz/123", "xyz"]);
			path.clear();
			await path.navigateAsync("bar/baz/123");
			await path.navigateAsync("//.././../xyz/.");
			expect(path.getHistory()).toBeArray(["", "bar/baz/123", "xyz"]);
		});
	});

	describe("Rendering views", (scope) => {
		scope.afterEach((t) => {
			app.clear();
			t.sleep(1);
		});

		test("Cell view from single instance", async () => {
			let view = new UICell();
			let app = useTestContext((options) => {
				options.renderFrequency = 5;
			});
			app.render(view);
			await app.renderer.expectOutputAsync(500, { source: view });
		});

		test("Cell view from single composite", async () => {
			class MyView extends ViewComposite {
				override createView = () => new UICell();
			}
			let view = new MyView();
			let app = useTestContext((options) => {
				options.renderFrequency = 5;
			});
			app.render(view);
			await app.renderer.expectOutputAsync(500, { source: view.body! });
		});

		test("Cell view from single controller, handle events", async (t) => {
			class MyView extends ViewComposite {
				override createView = () => new UICell();
				async onClick() {
					await Promise.resolve();
					throw Error("Catch me");
				}
			}
			let view = new MyView();
			let app = useTestContext((options) => {
				options.renderFrequency = 5;
			});
			app.render(view);
			let out = await app.renderer.expectOutputAsync(500, {
				source: view.body!,
			});
			let error = await t.tryRunAsync(async () => {
				out.getSingle().click();
				await t.sleep(10);
			});
			expect(error)
				.asString()
				.toMatchRegExp(/Catch me/);
		});

		test("Remove view after rendering", async () => {
			class MyView extends ViewComposite {
				override createView = () => new UICell();
			}
			let view = new MyView();
			let app = useTestContext((options) => {
				options.renderFrequency = 5;
			});
			let rendered = app.render(view);
			await app.renderer.expectOutputAsync(500, { source: view.body! });
			await rendered.removeAsync();
			app.renderer.expectOutput({ type: "cell" }).toBeEmpty();
		});

		test("Cell view from root activity", async () => {
			class MyActivity extends PageViewActivity {
				static override ViewBody = UICell;
			}
			let activity = new MyActivity();
			let app = useTestContext((options) => {
				options.renderFrequency = 5;
			});
			app.addActivity(activity, true);
			await app.renderer.expectOutputAsync(500, { source: activity.view! });
		});

		test("Remove view by deactivating activity", async (t) => {
			class MyActivity extends PageViewActivity {
				static override ViewBody = UICell;
			}
			let activity = new MyActivity();
			let app = useTestContext((options) => {
				options.renderFrequency = 5;
			});
			app.addActivity(activity, true);
			await t.pollAsync(() => !!activity.view, 5, 100);
			expect(activity).toHaveProperty("view").toBeInstanceOf(UICell);
			let view = activity.view!;
			await app.renderer.expectOutputAsync(100, { source: view });
			await activity.deactivateAsync();
			await t.pollAsync(() => !app.renderer.hasOutput(), 10, 100);
		});

		test("Request focus on last focused UI component", async (t) => {
			class MyActivity extends PageViewActivity {
				static override ViewBody = UICell.with(
					UICell.with({
						allowFocus: true,
						requestFocus: true,
						onFocusIn: "+CellFocused",
					})
				);
				protected override delegateViewEvent(
					event: ManagedEvent<ManagedObject, unknown, string>
				): boolean | Promise<void> {
					return super.delegateViewEvent(event);
				}
				onCellFocused() {
					t.count("focus");
				}
			}

			// show view activity with focused cell
			let app = useTestContext((options) => {
				options.renderFrequency = 5;
			});
			let activity = new MyActivity();
			app.addActivity(activity, true);
			let cellElt = (
				await t.expectOutputAsync(100, { focused: true })
			).getSingle();
			t.expectCount("focus").toBe(1);
			expect(cellElt.hasFocus()).toBeTruthy();

			// wait for tryFocusElement to stop trying to focus
			await t.expectOutputAsync(20);

			// now blur cell and wait
			cellElt.blur();
			await t.expectOutputAsync(100, { element: cellElt, focused: false });
			expect(cellElt.hasFocus()).toBeFalsy();

			// focus again using view activity
			activity.requestFocus();
			await t.expectOutputAsync(100, { element: cellElt, focused: true });
			t.expectCount("focus").toBe(2);
		});

		test("Simple alert dialog", async (t) => {
			let app = useTestContext();
			let p = app.showAlertDialogAsync("This is a test", "Test", "OK");
			(await t.expectOutputAsync(500, { type: "button", text: "OK" }))
				.getSingle()
				.click();
			let result = await p;
			expect(result).toBeUndefined();
		});

		test("Simple confirmation dialog", async (t) => {
			let app = useTestContext((options) => {
				options.renderFrequency = 5;
			});
			let p = app.showConfirmationDialogAsync(
				"This is a test",
				"Test",
				"Foo",
				"Bar"
			);
			(await t.expectOutputAsync(500, { type: "button", text: "Bar" }))
				.getSingle()
				.click();
			let result = await p;
			expect(result).toBe(false);
		});

		test("Simple modal menu", async (t) => {
			let app = useTestContext((options) => {
				options.renderFrequency = 5;
			});
			let button = new UIPrimaryButton("Test");
			app.render(button);
			await t.expectOutputAsync(100, { type: "button" });
			let p = app.showModalMenuAsync(
				[
					{ key: "one", text: "One" },
					{ key: "two", text: "Two" },
				],
				button
			);
			(await t.expectOutputAsync(500, { text: "Two" })).getSingle().click();
			let result = await p;
			expect(result).toBe("two");
		});
	});
});
