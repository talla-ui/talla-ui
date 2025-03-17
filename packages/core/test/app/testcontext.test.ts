import {
	TestNavigationContext,
	TestRenderer,
	clickOutputAsync,
	expectNavAsync,
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { ObjectReader, strf } from "@talla-ui/util";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
	Activity,
	AppContext,
	LocalData,
	MessageDialogOptions,
	ModalMenuOptions,
	NavigationTarget,
	UIButton,
	UICell,
	UIComponent,
	UIIconResource,
	UILabel,
	UITheme,
	app,
	ui,
} from "../../dist/index.js";

test("useTestContext result", () => {
	let app = useTestContext();
	expect(app.renderer).toBeInstanceOf(TestRenderer);
	expect(app.navigation).toBeInstanceOf(TestNavigationContext);
});

describe("Local data", () => {
	test("Empty data", async () => {
		let app = useTestContext();
		expect(app.localData).toBeInstanceOf(LocalData);
		let read = await app.localData.readAsync("test", {
			foo: { isOptional: true },
		});
		expect(read?.[0]).toHaveProperty("foo", undefined);
	});

	test("Specified local data", async () => {
		let app = useTestContext({ localData: { test: { foo: 123 } } });
		let read = await app.localData.readAsync("test", { foo: { isNumber: {} } });
		expect(read?.[0]).toHaveProperty("foo", 123);
	});

	test("Use ObjectReader", async () => {
		let app = useTestContext({ localData: { test: { foo: 123 } } });
		let reader = new ObjectReader({ foo: { isNumber: {} } });
		let read = await app.localData.readAsync("test", reader);
		expect(read?.[0]).toHaveProperty("foo", 123);
	});

	test("Write and read local data", async () => {
		let app = useTestContext({
			localData: { test: { foo: 123 }, other: { foo: 456 } },
		});
		await app.localData.writeAsync("test", { foo: 321 });
		let read = await app.localData.readAsync("test", { foo: { isNumber: {} } });
		expect(read?.[0]).toHaveProperty("foo", 321);
		let def = await app.localData.readAsync("other", { foo: { isNumber: {} } });
		expect(def?.[0]).toHaveProperty("foo", 456);
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
		expect(nav.getHistory()).toEqual(["foo", "foo/bar"]);
	});

	test("Navigation history: set, replace", async () => {
		let app = useTestContext({ navigationPageId: "foo" });
		let nav = app.navigation;
		await nav.navigateAsync(new NavigationTarget("foo/bar"));
		await nav.navigateAsync(new NavigationTarget("foo/bar/baz"), {
			replace: true,
		});
		expect(nav.getHistory()).toEqual(["foo", "foo/bar/baz"]);
	});

	test("Navigation history: back", async () => {
		let app = useTestContext({ navigationPageId: "foo" });
		let nav = app.navigation;
		await nav.navigateAsync(new NavigationTarget("foo"));
		await nav.navigateAsync(undefined, { back: true });
		expect(nav.getHistory()).toEqual(["foo"]);
	});

	test("Navigation history: back twice", async () => {
		let app = useTestContext({ navigationPageId: "foo" });
		app.navigate("foo/bar");
		await expectNavAsync({ pageId: "foo", detail: "bar" });
		app.navigate("/baz");
		await expectNavAsync({ pageId: "baz" });
		app.navigate(new NavigationTarget(), { back: true });
		app.goBack();
		await expectNavAsync({ pageId: "foo" });
	});

	test("Navigation history: back using goBack() sync", async () => {
		let app = useTestContext({ navigationPageId: "foo", navigationDelay: 0 });
		let nav = app.navigation;
		await nav.navigateAsync(new NavigationTarget("foo"));
		app.goBack();
		await expectNavAsync({ pageId: "foo" });
		expect(nav.getHistory()).toEqual(["foo"]);
	});

	test("Navigation history: back, set", async () => {
		let app = useTestContext({ navigationPageId: "foo" });
		let nav = app.navigation;
		await nav.navigateAsync(new NavigationTarget("bar"));
		await nav.navigateAsync(new NavigationTarget("baz"), { back: true });
		expect(nav.getHistory()).toEqual(["foo", "baz"]);
	});

	test("Navigation history: back, error if app would exit", async () => {
		let app = useTestContext({ navigationPageId: "foo" });
		let nav = app.navigation;
		await expect(
			nav.navigateAsync(undefined, { back: true }),
		).rejects.toThrowError(/exit/);
	});
});

describe("Rendering views", () => {
	afterEach(async () => {
		app.clear();
		await new Promise((r) => setTimeout(r, 1));
	});

	test("Cell view from single instance", async () => {
		let view = new UICell();
		let app = useTestContext();
		renderTestView(view);
		await app.renderer.expectOutputAsync({ source: view });
	});

	test("Cell view from single UI component", async () => {
		const MyView = UIComponent.define({}, ui.cell());
		let view = new MyView();
		let app = useTestContext();
		renderTestView(view);
		await app.renderer.expectOutputAsync({ source: view.body! });
	});

	test("Cell view from single controller, handle events", async () => {
		class MyView extends UIComponent.define({}, ui.cell()) {
			async onClick() {
				await Promise.resolve();
				throw Error("Catch me");
			}
		}
		let view = new MyView();
		useTestContext({ throwUncaughtErrors: false });
		let mockErrorHandler = vi.fn();
		AppContext.setErrorHandler(mockErrorHandler);
		renderTestView(view);
		expect(clickOutputAsync({ source: view.body! })).resolves;
		await new Promise((r) => setTimeout(r, 10));
		expect(mockErrorHandler).toHaveBeenCalled();
	});

	test("Remove view after rendering", async () => {
		const MyView = UIComponent.define({}, ui.cell());
		let view = new MyView();
		let app = useTestContext();
		let rendered = app.render(view);
		await app.renderer.expectOutputAsync({ source: view.body! });
		await rendered.removeAsync();
		app.renderer.expectOutput({ type: "cell" }).toBeEmpty();
	});

	test("View is not rendered twice", async () => {
		const view = new UICell(new UILabel("Test"));
		let app = useTestContext();
		app.render(view);
		let out1 = await app.renderer.expectOutputAsync({ type: "label" });
		view.findViewContent(UILabel)[0]!.text = "Foo";
		app.render(view);
		let out2 = await app.renderer.expectOutputAsync({ type: "label" });
		expect(out2.elements).toEqual(out1.elements);
	});

	test("Cell view from root activity", async () => {
		class MyActivity extends Activity {
			protected override createView() {
				return new UICell();
			}
		}
		let activity = new MyActivity();
		let app = useTestContext();
		app.addActivity(activity, true);
		await app.renderer.expectOutputAsync({ source: activity.view! });
	});

	test("Remove view by deactivating activity", async () => {
		class MyActivity extends Activity {
			protected override createView() {
				return new UICell();
			}
		}
		let activity = new MyActivity();
		let app = useTestContext();
		app.addActivity(activity, true);
		await expect
			.poll(() => !!activity.view, { interval: 5, timeout: 100 })
			.toBe(true);
		expect(activity.view).toBeInstanceOf(UICell);
		let view = activity.view!;
		await app.renderer.expectOutputAsync({ source: view });
		await activity.deactivateAsync();
		await expect
			.poll(() => !app.renderer.hasOutput(), {
				interval: 5,
				timeout: 100,
			})
			.toBe(true);
	});

	test("Show dialog", async () => {
		class MyActivity extends Activity {
			protected override createView() {
				this.setRenderMode("dialog");
				return new UICell(new UILabel("foo"));
			}
		}
		let activity = new MyActivity();
		let app = useTestContext();
		app.addActivity(activity, true);
		await app.renderer.expectOutputAsync({ text: "foo" });
		await activity.deactivateAsync();
		await expect
			.poll(() => !app.renderer.hasOutput(), { interval: 10, timeout: 100 })
			.toBe(true);
	});

	test("Show alert dialog", async () => {
		let app = useTestContext();
		let p = app.showAlertDialogAsync("This is a test", "OK");
		await clickOutputAsync({ type: "button", text: "OK" });
		let result = await p;
		expect(result).toBeUndefined();
	});

	test("Show confirmation dialog", async () => {
		let app = useTestContext();
		let p = app.showConfirmDialogAsync("This is a test", "Foo", "Bar");
		await clickOutputAsync({ type: "button", text: "Bar" });
		let result = await p;
		expect(result).toBe(false);
	});

	test("Show confirmation dialog using config class", async () => {
		let app = useTestContext();
		let myDialog = new MessageDialogOptions(
			["This is a test", "Another line goes here"],
			"Go ahead",
			"No, cancel",
			"Maybe",
			"question",
		);
		expect(myDialog?.messages).toHaveLength(2);
		expect(myDialog.type).toBe("question");
		expect(myDialog.confirmLabel).toBe("Go ahead");
		expect(myDialog.cancelLabel).toBe("No, cancel");
		expect(myDialog.otherLabel).toBe("Maybe");

		console.log("Showing dialog and clicking confirm");
		let p = app.showConfirmDialogAsync(myDialog);
		let expectDialog = await expectOutputAsync({
			accessibleRole: "alertdialog",
		});
		expectDialog.containing({ text: "This is a test" }).toBeRendered();
		expectDialog.containing({ text: "Another line goes here" }).toBeRendered();
		await clickOutputAsync({ type: "button", text: "Go ahead" });
		let result = await p;
		expect(result).toBe(true);

		console.log("Showing dialog and clicking cancel");
		p = app.showConfirmDialogAsync(myDialog);
		await clickOutputAsync({ type: "button", text: "No, cancel" });
		result = await p;
		expect(result).toBe(false);

		console.log("Showing dialog and clicking other");
		p = app.showConfirmDialogAsync(myDialog);
		await clickOutputAsync({ type: "button", text: "Maybe" });
		result = await p;
		expect(result).toBe(0);
	});

	test("Show confirm dialog, formatted", async () => {
		let app = useTestContext();
		let myDialog = new MessageDialogOptions(
			strf("This is a test, foo = %[foo]"),
			strf("OK"),
			strf("Foo: %[foo]"),
		);
		let formatted = myDialog.format({ foo: 123 });
		let p = app.showConfirmDialogAsync(formatted);
		await expectOutputAsync({ text: /foo = 123/ });
		await clickOutputAsync({ type: "button", text: "Foo: 123" });
		let result = await p;
		expect(result).toBe(false);
	});

	test("Show modal menu", async () => {
		let app = useTestContext();
		let button = new UIButton("Test");
		renderTestView(button);
		await expectOutputAsync({ type: "button" });
		let p = app.showModalMenuAsync(
			new ModalMenuOptions([
				{ key: "one", text: "One" },
				{ key: "two", text: "Two" },
			]),
			button,
		);
		await clickOutputAsync({ text: "Two" });
		let result = await p;
		expect(result).toBe("two");
	});

	test("Show modal menu, using configuration function", async () => {
		let app = useTestContext();
		let p = app.showModalMenuAsync((options) => {
			options.items.push({ key: "one", text: "One", hint: "1" });
			options.items.push({ separate: true });
			options.items.push({ key: "two", text: "Two", hint: "2" });
			options.width = 200;
		});
		await clickOutputAsync({ text: "Two" });
		let result = await p;
		expect(result).toBe("two");
	});
});

describe("Theme and base styles", () => {
	test("Clone theme", () => {
		let app = useTestContext();
		let oldTheme = app.theme!;
		expect(oldTheme).toBeInstanceOf(UITheme);
		expect(oldTheme.darkTextColor).toBe("#000000");
		app.theme = app.theme!.clone();
		expect(app.theme).not.toBe(oldTheme);
		expect(app.theme.colors).not.toBe(oldTheme.colors);
		expect(app.theme.icons).not.toBe(oldTheme.icons);
		expect(app.theme.animations).not.toBe(oldTheme.animations);
		expect(app.theme.styles).not.toBe(oldTheme.styles);
		expect(app.theme.darkTextColor).toBe(oldTheme.darkTextColor);
		app.theme.darkTextColor = "#123456";
		app = useTestContext();
		expect(app.theme?.darkTextColor).toBe(oldTheme.darkTextColor);
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
			let styles = myStyle.getStyles();
			expect(Array.isArray(styles)).toBe(true);
			expect(styles[styles.length - 1]).toHaveProperty(
				"textColor",
				ui.color.GREEN,
			);
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
			expect(object).toHaveProperty("textColor", ui.color.GREEN);
		});

		test("Styles cached until theme changed", () => {
			let app = useTestContext();
			app.theme!.styles.set("Button", [{ textColor: ui.color.GREEN }]);
			let myButtonStyle = ui.style.BUTTON.extend({ padding: 8 });
			let styles = myButtonStyle.getStyles().slice(-2);
			expect(styles[0]?.textColor).toBe(ui.color.GREEN);
			expect(styles[1]?.padding).toBe(8);

			console.log("Clearing test context");
			app = useTestContext();
			app.theme!.styles.set("Button", [{ padding: 0 }]);
			styles = myButtonStyle.getStyles().slice(-2);
			expect("textColor" in styles[0]!).toBeFalsy();
			expect(styles[1]).toHaveProperty("padding", 8);
		});
	});
});
