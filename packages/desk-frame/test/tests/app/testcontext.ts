import {
	TestActivationPath,
	TestRenderer,
	describe,
	expect,
	test,
	useTestContext,
} from "@desk-framework/test";
import {
	ManagedEvent,
	MessageDialogOptions,
	PageViewActivity,
	UIButtonStyle,
	UICell,
	UIColor,
	UIIconResource,
	UIPrimaryButton,
	UITheme,
	ViewComposite,
	app,
	strf,
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
				path.navigateAsync("", { back: true }),
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
			await app.renderer.expectOutputAsync(100, { source: view });
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
			await app.renderer.expectOutputAsync(100, { source: view.body! });
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
			await app.renderer.expectOutputAsync(100, { source: view.body! });
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
			await app.renderer.expectOutputAsync(100, { source: activity.view! });
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
					}),
				);
				protected override delegateViewEvent(event: ManagedEvent) {
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

		test("Show alert dialog", async (t) => {
			let app = useTestContext();
			let p = app.showAlertDialogAsync("This is a test", "OK");
			(await t.expectOutputAsync(100, { type: "button", text: "OK" }))
				.getSingle()
				.click();
			let result = await p;
			expect(result).toBeUndefined();
		});

		test("Show confirmation dialog", async (t) => {
			let app = useTestContext((options) => {
				options.renderFrequency = 5;
			});
			let p = app.showConfirmDialogAsync("This is a test", "Foo", "Bar");
			(await t.expectOutputAsync(100, { type: "button", text: "Bar" }))
				.getSingle()
				.click();
			let result = await p;
			expect(result).toBe(false);
		});

		test("Show confirmation dialog using config class", async (t) => {
			let app = useTestContext((options) => {
				options.renderFrequency = 5;
			});
			let myDialog = new MessageDialogOptions(
				["This is a test", "Another line goes here"],
				"Go ahead",
				"No, cancel",
				"Maybe",
				"question",
			);
			expect(myDialog).toHaveProperty("messages").toBeArray(2);
			expect(myDialog).toHaveProperties({
				type: "question",
				confirmLabel: "Go ahead",
				cancelLabel: "No, cancel",
				otherLabel: "Maybe",
			});

			t.log("Showing dialog and clicking confirm");
			let p = app.showConfirmDialogAsync(myDialog);
			let expectDialog = await t.expectOutputAsync(50, {
				accessibleRole: "alertdialog",
			});
			expectDialog.containing({ text: "This is a test" }).toBeRendered();
			expectDialog
				.containing({ text: "Another line goes here" })
				.toBeRendered();
			(await t.expectOutputAsync(100, { type: "button", text: "Go ahead" }))
				.getSingle()
				.click();
			let result = await p;
			expect(result).toBe(true);

			t.log("Showing dialog and clicking cancel");
			p = app.showConfirmDialogAsync(myDialog);
			(await t.expectOutputAsync(100, { type: "button", text: "No, cancel" }))
				.getSingle()
				.click();
			result = await p;
			expect(result).toBe(false);

			t.log("Showing dialog and clicking other");
			p = app.showConfirmDialogAsync(myDialog);
			(await t.expectOutputAsync(100, { type: "button", text: "Maybe" }))
				.getSingle()
				.click();
			result = await p;
			expect(result).toBe(0);
		});

		test("Show confirm dialog, formatted", async (t) => {
			let app = useTestContext((options) => {
				options.renderFrequency = 5;
			});
			let myDialog = new MessageDialogOptions(
				strf("This is a test, foo = %[foo]"),
				strf("OK"),
				strf("Foo: %[foo]"),
			);
			let formatted = myDialog.format({ foo: 123 });
			let p = app.showConfirmDialogAsync(formatted);
			await t.expectOutputAsync(100, { text: /foo = 123/ });
			(await t.expectOutputAsync(100, { type: "button", text: "Foo: 123" }))
				.getSingle()
				.click();
			let result = await p;
			expect(result).toBe(false);
		});

		test("Show modal menu", async (t) => {
			let app = useTestContext((options) => {
				options.renderFrequency = 5;
			});
			let button = new UIPrimaryButton("Test");
			app.render(button);
			await t.expectOutputAsync(100, { type: "button" });
			let p = app.showModalMenuAsync(
				new UITheme.MenuOptions([
					{ key: "one", text: "One" },
					{ key: "two", text: "Two" },
				]),
				button,
			);
			(await t.expectOutputAsync(100, { text: "Two" })).getSingle().click();
			let result = await p;
			expect(result).toBe("two");
		});

		test("Show modal menu, using configuration function", async (t) => {
			let app = useTestContext((options) => {
				options.renderFrequency = 5;
			});
			let p = app.showModalMenuAsync((options) => {
				options.items.push({ key: "one", text: "One", hint: "1" });
				options.items.push({ separate: true });
				options.items.push({ key: "two", text: "Two", hint: "2" });
				options.width = 200;
			});
			(await t.expectOutputAsync(100, { text: "Two" })).getSingle().click();
			let result = await p;
			expect(result).toBe("two");
		});
	});

	describe("Theme and base styles", () => {
		test("Clone theme", () => {
			let app = useTestContext();
			expect(app).toHaveProperty("theme").toBeInstanceOf(UITheme);
			expect(app.theme!.darkTextColor).toBe("#000000");
			app.theme!.darkTextColor = "#111111";
			let clone = app.theme!.clone();
			expect(clone).not.toBe(app.theme);
			expect(clone.colors).not.toBe(app.theme!.colors);
			expect(clone.icons).not.toBe(app.theme!.icons);
			expect(clone.animations).not.toBe(app.theme!.animations);
			expect(clone.styles).not.toBe(app.theme!.styles);
			expect(clone.darkTextColor).toBe(app.theme!.darkTextColor);
			app = useTestContext();
			expect(clone.darkTextColor).not.toBe(app.theme!.darkTextColor);
		});

		test("Select icons are mirrored in RTL", () => {
			let icon = new UIIconResource("test").setMirrorRTL();
			expect(icon.isMirrorRTL()).toBe(true);

			// check on standard icons
			let app = useTestContext();
			expect(app.theme!.icons.get("chevronNext")!.isMirrorRTL()).toBe(true);
			expect(app.theme!.icons.get("chevronBack")!.isMirrorRTL()).toBe(true);
			expect(app.theme!.icons.get("chevronUp")!.isMirrorRTL()).toBe(false);
			expect(app.theme!.icons.get("chevronDown")!.isMirrorRTL()).toBe(false);
		});

		describe("Base styles", () => {
			test("Extend base style using static method", () => {
				let MyStyle = UIButtonStyle.extend({
					textColor: UIColor["@green"],
				});
				let expectStyles = expect(new MyStyle())
					.toHaveMethod("getStyles")
					.not.toThrowError();
				expectStyles.toBeArray();
				let styles = new MyStyle().getStyles();
				expect(styles[styles.length - 1])
					.toHaveProperty("textColor")
					.toBe(UIColor["@green"]);
			});

			test("Extend base style using class", () => {
				class MyStyle extends UIButtonStyle {
					override getStyles() {
						return [...super.getStyles(), { textColor: UIColor["@green"] }];
					}
				}
				expect(() => new MyStyle()).not.toThrowError();
			});

			test("Override base style", () => {
				let override = UIButtonStyle.override({
					textColor: UIColor["@green"],
				});
				expect(override.overrides).toBeArray(1);
				expect(override.overrides[0])
					.toHaveProperty("textColor")
					.toBe(UIColor["@green"]);
			});

			test("Styles cache is cleared on context clear", (t) => {
				let app = useTestContext();
				app.theme!.styles.set(UIButtonStyle, [
					{ textColor: UIColor["@green"] },
				]);
				let MyButtonStyle = UIButtonStyle.extend({ padding: 8 });
				let styles = new MyButtonStyle().getStyles().slice(-2);
				expect(styles[0]).toHaveProperty("textColor").toBe(UIColor["@green"]);
				expect(styles[1]).toHaveProperty("padding").toBe(8);

				t.log("Clearing test context");
				app = useTestContext();
				app.theme!.styles.set(UIButtonStyle, [{ padding: 0 }]);
				styles = new MyButtonStyle().getStyles().slice(-2);
				expect(styles[0]).not.toHaveProperty("textColor");
				expect(styles[1]).toHaveProperty("padding").toBe(8);
			});
		});
	});
});
