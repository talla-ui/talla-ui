import {
	TestNavigationContext,
	TestRenderer,
	describe,
	expect,
	test,
	useTestContext,
} from "@talla-ui/test-handler";
import {
	Activity,
	LocalData,
	MessageDialogOptions,
	ModalMenuOptions,
	NavigationTarget,
	UIButton,
	UICell,
	UIIconResource,
	UILabel,
	UITheme,
	ViewComposite,
	app,
	strf,
	ui,
} from "../../../dist/index.js";

describe("TestContext", () => {
	test("useTestContext result", (t) => {
		t.breakOnFail();
		let app = useTestContext();
		expect(app.renderer).toBeInstanceOf(TestRenderer);
		expect(app.navigation).toBeInstanceOf(TestNavigationContext);
	});

	describe("Local data", () => {
		test("Empty data", () => {
			let app = useTestContext();
			expect(app.localData).toBeInstanceOf(LocalData);
			expect(app.localData.read("test", { foo: { isOptional: true } }))
				.toHaveProperty("0")
				.toHaveProperty("foo")
				.toBeUndefined();
		});

		test("Specified local data", () => {
			let app = useTestContext({ localData: { test: { foo: 123 } } });
			expect(app.localData.read("test", { foo: { isNumber: {} } }))
				.toHaveProperty("0")
				.toHaveProperty("foo")
				.toBe(123);
		});

		test("Write and read local data", () => {
			let app = useTestContext({ localData: { test: { foo: 123 } } });
			app.localData.write("test", { foo: 321 });
			expect(app.localData.read("test", { foo: { isNumber: {} } }))
				.toHaveProperty("0")
				.toHaveProperty("foo")
				.toBe(321);
		});
	});

	describe("Navigation paths", () => {
		test("Initial path: default", () => {
			let app = useTestContext();
			expect(app.navigation.pageId).toBe("");
			expect(app.navigation.detail).toBe("");
		});

		test("Initial path: set in options", () => {
			let app = useTestContext({ navigationPageId: "foo" });
			expect(app.navigation.pageId).toBe("foo");
		});

		test("Navigation history: set once", async () => {
			let app = useTestContext({ navigationPageId: "foo" });
			let nav = app.navigation;
			await nav.navigateAsync(new NavigationTarget("foo/bar"));
			expect(nav.getHistory()).toBeArray(["foo", "foo/bar"]);
		});

		test("Navigation history: set, replace", async () => {
			let app = useTestContext({ navigationPageId: "foo" });
			let nav = app.navigation;
			await nav.navigateAsync(new NavigationTarget("foo/bar"));
			await nav.navigateAsync(new NavigationTarget("foo/bar/baz"), {
				replace: true,
			});
			expect(nav.getHistory()).toBeArray(["foo", "foo/bar/baz"]);
		});

		test("Navigation history: back", async () => {
			let app = useTestContext({ navigationPageId: "foo" });
			let nav = app.navigation;
			await nav.navigateAsync(new NavigationTarget("foo"));
			await nav.navigateAsync(undefined, { back: true });
			expect(nav.getHistory()).toBeArray(["foo"]);
		});

		test("Navigation history: back twice", async (t) => {
			let app = useTestContext({ navigationPageId: "foo" });
			app.navigate("foo/bar");
			await t.expectNavAsync({ pageId: "foo", detail: "bar" });
			app.navigate("/baz");
			await t.expectNavAsync({ pageId: "baz" });
			app.navigate(new NavigationTarget(), { back: true });
			app.goBack();
			await t.expectNavAsync({ pageId: "foo" });
		});

		test("Navigation history: back using goBack() sync", async (t) => {
			let app = useTestContext({ navigationPageId: "foo", navigationDelay: 0 });
			let nav = app.navigation;
			await nav.navigateAsync(new NavigationTarget("foo"));
			app.goBack();
			await t.expectNavAsync({ pageId: "foo" });
			expect(nav.getHistory()).toBeArray(["foo"]);
		});

		test("Navigation history: back, set", async () => {
			let app = useTestContext({ navigationPageId: "foo" });
			let nav = app.navigation;
			await nav.navigateAsync(new NavigationTarget("bar"));
			await nav.navigateAsync(new NavigationTarget("baz"), { back: true });
			expect(nav.getHistory()).toBeArray(["foo", "baz"]);
		});

		test("Navigation history: back, error if app would exit", async () => {
			let app = useTestContext({ navigationPageId: "foo" });
			let nav = app.navigation;
			await expect(async () =>
				nav.navigateAsync(undefined, { back: true }),
			).toThrowErrorAsync();
		});
	});

	describe("Rendering views", (scope) => {
		scope.afterEach((t) => {
			app.clear();
			t.sleep(1);
		});

		test("Cell view from single instance", async (t) => {
			let view = new UICell();
			let app = useTestContext({ renderFrequency: 5 });
			t.render(view);
			await app.renderer.expectOutputAsync({ source: view });
		});

		test("Cell view from single composite", async (t) => {
			const MyView = ViewComposite.define({}, ui.cell());
			let view = new MyView();
			let app = useTestContext({ renderFrequency: 5 });
			t.render(view);
			await app.renderer.expectOutputAsync({ source: view.body! });
		});

		test("Cell view from single controller, handle events", async (t) => {
			class MyView extends ViewComposite.define({}, ui.cell()) {
				async onClick() {
					await Promise.resolve();
					throw Error("Catch me");
				}
			}
			let view = new MyView();
			let app = useTestContext({ renderFrequency: 5 });
			t.render(view);
			let out = await app.renderer.expectOutputAsync({
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

		test("Remove view after rendering", async (t) => {
			const MyView = ViewComposite.define({}, ui.cell());
			let view = new MyView();
			let app = useTestContext({ renderFrequency: 5 });
			let rendered = t.render(view);
			await app.renderer.expectOutputAsync({ source: view.body! });
			await rendered.removeAsync();
			app.renderer.expectOutput({ type: "cell" }).toBeEmpty();
		});

		test("View is not rendered twice", async (t) => {
			const view = new UICell(new UILabel("Test"));
			let app = useTestContext({ renderFrequency: 5 });
			t.render(view);
			let out1 = await app.renderer.expectOutputAsync({ type: "label" });
			view.findViewContent(UILabel)[0]!.text = "Foo";
			t.render(view);
			let out2 = await app.renderer.expectOutputAsync({ type: "label" });
			expect(out2.elements).toBeArray(out1.elements);
		});

		test("Cell view from root activity", async () => {
			class MyActivity extends Activity {
				protected override createView() {
					return new UICell();
				}
			}
			let activity = new MyActivity();
			let app = useTestContext({ renderFrequency: 5 });
			app.addActivity(activity, true);
			await app.renderer.expectOutputAsync({ source: activity.view! });
		});

		test("Remove view by deactivating activity", async (t) => {
			class MyActivity extends Activity {
				protected override createView() {
					return new UICell();
				}
			}
			let activity = new MyActivity();
			let app = useTestContext({ renderFrequency: 5 });
			app.addActivity(activity, true);
			await t.pollAsync(() => !!activity.view, 5, 100);
			expect(activity).toHaveProperty("view").toBeInstanceOf(UICell);
			let view = activity.view!;
			await app.renderer.expectOutputAsync({ source: view });
			await activity.deactivateAsync();
			await t.pollAsync(() => !app.renderer.hasOutput(), 10, 100);
		});

		test("Show dialog", async (t) => {
			class MyActivity extends Activity {
				protected override createView() {
					this.setRenderMode("dialog");
					return new UICell(new UILabel("foo"));
				}
			}
			let activity = new MyActivity();
			let app = useTestContext({ renderFrequency: 5 });
			app.addActivity(activity, true);
			await app.renderer.expectOutputAsync({ text: "foo" });
			await activity.deactivateAsync();
			await t.pollAsync(() => !app.renderer.hasOutput(), 10, 100);
		});

		test("Show alert dialog", async (t) => {
			let app = useTestContext();
			let p = app.showAlertDialogAsync("This is a test", "OK");
			await t.clickOutputAsync({ type: "button", text: "OK" });
			let result = await p;
			expect(result).toBeUndefined();
		});

		test("Show confirmation dialog", async (t) => {
			let app = useTestContext({ renderFrequency: 5 });
			let p = app.showConfirmDialogAsync("This is a test", "Foo", "Bar");
			await t.clickOutputAsync({ type: "button", text: "Bar" });
			let result = await p;
			expect(result).toBe(false);
		});

		test("Show confirmation dialog using config class", async (t) => {
			let app = useTestContext({ renderFrequency: 5 });
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
			let expectDialog = await t.expectOutputAsync({
				accessibleRole: "alertdialog",
			});
			expectDialog.containing({ text: "This is a test" }).toBeRendered();
			expectDialog
				.containing({ text: "Another line goes here" })
				.toBeRendered();
			await t.clickOutputAsync({ type: "button", text: "Go ahead" });
			let result = await p;
			expect(result).toBe(true);

			t.log("Showing dialog and clicking cancel");
			p = app.showConfirmDialogAsync(myDialog);
			await t.clickOutputAsync({ type: "button", text: "No, cancel" });
			result = await p;
			expect(result).toBe(false);

			t.log("Showing dialog and clicking other");
			p = app.showConfirmDialogAsync(myDialog);
			await t.clickOutputAsync({ type: "button", text: "Maybe" });
			result = await p;
			expect(result).toBe(0);
		});

		test("Show confirm dialog, formatted", async (t) => {
			let app = useTestContext({ renderFrequency: 5 });
			let myDialog = new MessageDialogOptions(
				strf("This is a test, foo = %[foo]"),
				strf("OK"),
				strf("Foo: %[foo]"),
			);
			let formatted = myDialog.format({ foo: 123 });
			let p = app.showConfirmDialogAsync(formatted);
			await t.expectOutputAsync({ text: /foo = 123/ });
			await t.clickOutputAsync({ type: "button", text: "Foo: 123" });
			let result = await p;
			expect(result).toBe(false);
		});

		test("Show modal menu", async (t) => {
			let app = useTestContext({ renderFrequency: 5 });
			let button = new UIButton("Test");
			t.render(button);
			await t.expectOutputAsync({ type: "button" });
			let p = app.showModalMenuAsync(
				new ModalMenuOptions([
					{ key: "one", text: "One" },
					{ key: "two", text: "Two" },
				]),
				button,
			);
			await t.clickOutputAsync({ text: "Two" });
			let result = await p;
			expect(result).toBe("two");
		});

		test("Show modal menu, using configuration function", async (t) => {
			let app = useTestContext({ renderFrequency: 5 });
			let p = app.showModalMenuAsync((options) => {
				options.items.push({ key: "one", text: "One", hint: "1" });
				options.items.push({ separate: true });
				options.items.push({ key: "two", text: "Two", hint: "2" });
				options.width = 200;
			});
			await t.clickOutputAsync({ text: "Two" });
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
			let icon = new UIIconResource("Test").setMirrorRTL();
			expect(icon.isMirrorRTL()).toBe(true);

			// check on standard icons
			let app = useTestContext();
			expect(app.theme!.icons.get("ChevronNext")!.isMirrorRTL()).toBe(true);
			expect(app.theme!.icons.get("ChevronBack")!.isMirrorRTL()).toBe(true);
			expect(app.theme!.icons.get("ChevronUp")!.isMirrorRTL()).toBe(false);
			expect(app.theme!.icons.get("ChevronDown")!.isMirrorRTL()).toBe(false);
		});

		describe("Styles", () => {
			test("Extend base style", () => {
				let myStyle = ui.style.BUTTON.extend({
					textColor: ui.color.GREEN,
				});
				let expectStyles = expect(myStyle)
					.toHaveMethod("getStyles")
					.not.toThrowError();
				expectStyles.toBeArray();
				let styles = myStyle.getStyles();
				expect(styles[styles.length - 1])
					.toHaveProperty("textColor")
					.toBe(ui.color.GREEN);
			});

			test("Override base style", () => {
				let override = ui.style.BUTTON.override(
					{
						width: 1,
						textColor: ui.color.BLUE,
					},
					{
						textColor: ui.color.GREEN,
					},
				);
				let object = override.getOverrides();
				expect(object).toHaveProperty("textColor").toBe(ui.color.GREEN);
			});

			test("Styles cached until theme changed", (t) => {
				let app = useTestContext();
				app.theme!.styles.set("Button", [{ textColor: ui.color.GREEN }]);
				let myButtonStyle = ui.style.BUTTON.extend({ padding: 8 });
				let styles = myButtonStyle.getStyles().slice(-2);
				expect(styles[0]).toHaveProperty("textColor").toBe(ui.color.GREEN);
				expect(styles[1]).toHaveProperty("padding").toBe(8);

				t.log("Clearing test context");
				app = useTestContext();
				app.theme!.styles.set("Button", [{ padding: 0 }]);
				styles = myButtonStyle.getStyles().slice(-2);
				expect(styles[0]).not.toHaveProperty("textColor");
				expect(styles[1]).toHaveProperty("padding").toBe(8);
			});
		});
	});
});
