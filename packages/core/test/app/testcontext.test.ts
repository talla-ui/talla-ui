import {
	TestNavigationContext,
	TestRenderer,
	clickOutputAsync,
	expectNavAsync,
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { fmt } from "@talla-ui/util";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
	Activity,
	AppContext,
	MessageDialogOptions,
	ModalMenuOptions,
	UI,
	UIButton,
	UIColumn,
	UIText,
	ViewEvent,
	Widget,
	app,
} from "../../dist/index.js";

test("useTestContext result", () => {
	let app = useTestContext();
	expect(app.renderer).toBeInstanceOf(TestRenderer);
	expect(app.navigation).toBeInstanceOf(TestNavigationContext);
});

describe("Navigation paths", () => {
	test("Initial path: default", () => {
		let app = useTestContext();
		expect(app.navigation.path).toBe("");
	});

	test("Initial path: set in options", () => {
		let app = useTestContext((options) => {
			options.navigationPath = "foo";
		});
		expect(app.navigation.path).toBe("foo");
	});

	test("Navigation history: set once", async () => {
		let app = useTestContext((options) => {
			options.navigationPath = "foo";
		});
		let nav = app.navigation;
		await nav.navigateAsync("foo/bar");
		expect(nav.getHistory()).toEqual(["foo", "foo/bar"]);
	});

	test("Navigation history: set, replace", async () => {
		let app = useTestContext((options) => {
			options.navigationPath = "foo";
		});
		let nav = app.navigation;
		await nav.navigateAsync("foo/bar");
		await nav.navigateAsync("foo/bar/baz", {
			replace: true,
		});
		expect(nav.getHistory()).toEqual(["foo", "foo/bar/baz"]);
	});

	test("Navigation history: back", async () => {
		let app = useTestContext((options) => {
			options.navigationPath = "foo";
		});
		let nav = app.navigation;
		await nav.navigateAsync("bar");
		await nav.navigateAsync(undefined, { back: true });
		expect(nav.getHistory()).toEqual(["foo"]);
	});

	test("Navigation history: back twice", async () => {
		let app = useTestContext((options) => {
			options.navigationPath = "foo";
		});
		app.navigate("foo/bar");
		await expectNavAsync({ path: "foo/bar" });
		app.navigate("/baz");
		await expectNavAsync({ path: "baz" });
		app.goBack();
		app.goBack();
		await expectNavAsync({ path: "foo" });
	});

	test("Navigation history: back using goBack() sync", async () => {
		let app = useTestContext((options) => {
			options.navigationPath = "foo";
		});
		let nav = app.navigation;
		await nav.navigateAsync("foo/bar");
		app.goBack();
		await expectNavAsync({ path: "foo" });
		expect(nav.getHistory()).toEqual(["foo"]);
	});

	test("Navigation history: back, set", async () => {
		let app = useTestContext((options) => {
			options.navigationPath = "foo";
		});
		let nav = app.navigation;
		await nav.navigateAsync("bar");
		await nav.navigateAsync("baz", { back: true });
		expect(nav.getHistory()).toEqual(["foo", "baz"]);
	});

	test("Navigation history: back, error if app would exit", async () => {
		let app = useTestContext((options) => {
			options.navigationPath = "foo";
		});
		let nav = app.navigation;
		await expect(
			nav.navigateAsync(undefined, { back: true }),
		).rejects.toThrowError(/exit/);
	});

	test("Navigation history: replace 'prefix' without slash", async () => {
		let app = useTestContext();
		let nav = app.navigation;
		let R = { replace: "prefix", prefix: "foo" } as const;
		await nav.navigateAsync("foo", R);
		expect(nav.getHistory()).toEqual(["", "foo"]);
		await nav.navigateAsync("foo/1", R);
		expect(nav.getHistory()).toEqual(["", "foo/1"]);
	});

	test("Navigation history: replace 'prefix' with slash", async () => {
		let app = useTestContext();
		let nav = app.navigation;
		let R = { replace: "prefix", prefix: "foo/" } as const;
		await nav.navigateAsync("foo/", R); // slash will be stripped
		expect(nav.getHistory()).toEqual(["", "foo"]);
		await nav.navigateAsync("foo/1", R); // not replaced, foo itself doesn't match
		expect(nav.getHistory()).toEqual(["", "foo", "foo/1"]);
	});
});

describe("Rendering views", () => {
	afterEach(async () => {
		app.clear();
		await new Promise((r) => setTimeout(r, 1));
	});

	test("Column view from single instance", async () => {
		let view = new UIColumn();
		let app = useTestContext();
		renderTestView(view);
		await app.renderer.expectOutputAsync({ source: view });
	});

	test("Column view from single widget", async () => {
		const MyWidget = Widget.builder(() => UI.Column());
		let view = MyWidget.build();
		let app = useTestContext();
		renderTestView(view);
		await app.renderer.expectOutputAsync({
			type: "column",
			source: view.findViewContent(UIColumn)[0]!,
		});
	});

	test("Column view from single widget, handle events async", async () => {
		class ColumnWidget extends Widget {
			async onClick(e: ViewEvent) {
				expect(e.source).toBeInstanceOf(UIColumn);
				await Promise.resolve();
				throw Error("Catch me");
			}
		}
		const MyWidget = ColumnWidget.builder(() => UI.Column());
		let view = MyWidget.build();
		useTestContext((options) => {
			options.throwUncaughtErrors = false;
		});
		let mockErrorHandler = vi.fn();
		AppContext.setErrorHandler(mockErrorHandler);
		renderTestView(view);
		expect(clickOutputAsync({ source: view.findViewContent(UIColumn)[0]! }))
			.resolves;
		await new Promise((r) => setTimeout(r, 10));
		expect(mockErrorHandler).toHaveBeenCalled();
	});

	test("Remove view after rendering", async () => {
		const MyWidget = Widget.builder(() => UI.Column());
		let view = MyWidget.build();
		let app = useTestContext();
		let rendered = app.render(view);
		await app.renderer.expectOutputAsync({
			type: "column",
			source: view.findViewContent(UIColumn)[0]!,
		});
		await rendered.removeAsync();
		app.renderer.expectOutput({ type: "column" }).toBeEmpty();
	});

	test("View is not rendered twice", async () => {
		const view = new UIColumn();
		view.content.add(new UIText("Test"));
		let app = useTestContext();
		app.render(view);
		let out1 = await app.renderer.expectOutputAsync({ type: "text" });
		view.findViewContent(UIText)[0]!.text = "Foo";
		app.render(view);
		let out2 = await app.renderer.expectOutputAsync({ type: "text" });
		expect(out2.elements).toEqual(out1.elements);
	});

	test("Column view from root activity", async () => {
		class MyActivity extends Activity {
			static override View() {
				return UI.Column();
			}
		}
		let activity = new MyActivity();
		let app = useTestContext();
		app.addActivity(activity, true);
		await app.renderer.expectOutputAsync({ source: activity.view! });
	});

	test("Remove view by deactivating activity", async () => {
		class MyActivity extends Activity {
			static override View() {
				return UI.Column();
			}
		}
		let activity = new MyActivity();
		let app = useTestContext();
		app.addActivity(activity, true);
		await expect
			.poll(() => !!activity.view, { interval: 5, timeout: 100 })
			.toBe(true);
		expect(activity.view).toBeInstanceOf(UIColumn);
		let view = activity.view!;
		await app.renderer.expectOutputAsync({ source: view });
		activity.deactivate();
		await expect
			.poll(() => !app.renderer.hasOutput(), {
				interval: 5,
				timeout: 100,
			})
			.toBe(true);
	});

	test("Show dialog", async () => {
		class MyActivity extends Activity {
			static override View() {
				return UI.Column(UI.Text("foo"));
			}
			constructor() {
				super();
				this.setRenderMode("dialog");
			}
		}
		let activity = new MyActivity();
		let app = useTestContext();
		app.addActivity(activity, true);
		await app.renderer.expectOutputAsync({ text: "foo" });
		activity.deactivate();
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
		expect(myDialog.confirmText).toBe("Go ahead");
		expect(myDialog.cancelText).toBe("No, cancel");
		expect(myDialog.otherText).toBe("Maybe");

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
			fmt("This is a test, foo = {foo}"),
			fmt("OK"),
			fmt("Foo: {foo}"),
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
				{ value: "one", text: "One" },
				{ value: "two", text: "Two" },
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
			options.items.push({ value: "one", text: "One", hint: "1" });
			options.items.push({ divider: true });
			options.items.push({ value: "two", text: "Two", hint: "2" });
			options.width = 200;
		});

		// click the text 'Two' inside of a row with accessibleRole 'menuitem':
		await clickOutputAsync({ accessibleRole: "menuitem" }, { text: "Two" });
		let result = await p;
		expect(result).toBe("two");
	});
});
