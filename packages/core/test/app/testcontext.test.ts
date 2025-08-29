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
	CustomView,
	CustomViewBuilder,
	LocalData,
	MessageDialogOptions,
	ModalMenuOptions,
	UI,
	UIButton,
	UICell,
	UILabel,
	ViewEvent,
	app,
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
		let read = await app.localData.readAsync("test", (b) =>
			b.object({
				foo: b.any(),
			}),
		);
		expect(read?.data).toHaveProperty("foo", undefined);
	});

	test("Specified local data", async () => {
		let app = useTestContext({ localData: { test: { foo: 123 } } });
		let read = await app.localData.readAsync("test", (b) =>
			b.object({ foo: b.number() }),
		);
		expect(read?.data).toHaveProperty("foo", 123);
	});

	test("Write and read local data", async () => {
		let app = useTestContext({
			localData: { foo: 123, test: { foo: 123 }, other: { foo: 456 } },
		});
		await app.localData.writeAsync("foo", 321);
		let readFoo = await app.localData.readAsync("foo", (b) => b.number());
		expect(readFoo?.errors).toBeUndefined();
		expect(readFoo?.data).toBe(321);
		await app.localData.writeAsync("test", { foo: 321 });
		let readTest = await app.localData.readAsync("test", (b) =>
			b.object({ foo: b.number() }),
		);
		expect(readTest?.data).toHaveProperty("foo", 321);
		let def = await app.localData.readAsync("other", (b) =>
			b.object({ foo: b.number() }),
		);
		expect(def?.data).toHaveProperty("foo", 456);
	});
});

describe("Navigation paths", () => {
	test("Initial path: default", () => {
		let app = useTestContext();
		expect(app.navigation.path).toBe("");
	});

	test("Initial path: set in options", () => {
		let app = useTestContext({ navigationPath: "foo" });
		expect(app.navigation.path).toBe("foo");
	});

	test("Navigation history: set once", async () => {
		let app = useTestContext({ navigationPath: "foo" });
		let nav = app.navigation;
		await nav.navigateAsync("foo/bar");
		expect(nav.getHistory()).toEqual(["foo", "foo/bar"]);
	});

	test("Navigation history: set, replace", async () => {
		let app = useTestContext({ navigationPath: "foo" });
		let nav = app.navigation;
		await nav.navigateAsync("foo/bar");
		await nav.navigateAsync("foo/bar/baz", {
			replace: true,
		});
		expect(nav.getHistory()).toEqual(["foo", "foo/bar/baz"]);
	});

	test("Navigation history: back", async () => {
		let app = useTestContext({ navigationPath: "foo" });
		let nav = app.navigation;
		await nav.navigateAsync("bar");
		await nav.navigateAsync(undefined, { back: true });
		expect(nav.getHistory()).toEqual(["foo"]);
	});

	test("Navigation history: back twice", async () => {
		let app = useTestContext({ navigationPath: "foo" });
		app.navigate("foo/bar");
		await expectNavAsync({ path: "foo/bar" });
		app.navigate("/baz");
		await expectNavAsync({ path: "baz" });
		app.goBack();
		app.goBack();
		await expectNavAsync({ path: "foo" });
	});

	test("Navigation history: back using goBack() sync", async () => {
		let app = useTestContext({ navigationPath: "foo" });
		let nav = app.navigation;
		await nav.navigateAsync("foo/bar");
		app.goBack();
		await expectNavAsync({ path: "foo" });
		expect(nav.getHistory()).toEqual(["foo"]);
	});

	test("Navigation history: back, set", async () => {
		let app = useTestContext({ navigationPath: "foo" });
		let nav = app.navigation;
		await nav.navigateAsync("bar");
		await nav.navigateAsync("baz", { back: true });
		expect(nav.getHistory()).toEqual(["foo", "baz"]);
	});

	test("Navigation history: back, error if app would exit", async () => {
		let app = useTestContext({ navigationPath: "foo" });
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

	test("Cell view from single instance", async () => {
		let view = new UICell();
		let app = useTestContext();
		renderTestView(view);
		await app.renderer.expectOutputAsync({ source: view });
	});

	test("Cell view from single custom view", async () => {
		const MyView = CustomViewBuilder(CustomView, () => UI.Cell());
		let view = MyView.create();
		let app = useTestContext();
		renderTestView(view);
		await app.renderer.expectOutputAsync({
			type: "cell",
			source: view.findViewContent(UICell)[0]!,
		});
	});

	test("Cell view from single custom view, handle events async", async () => {
		class CellView extends CustomView {
			async onClick(e: ViewEvent) {
				expect(e.source).toBeInstanceOf(UICell);
				await Promise.resolve();
				throw Error("Catch me");
			}
		}
		const MyView = CustomViewBuilder(CellView, () => UI.Cell());
		let view = MyView.create();
		useTestContext({ throwUncaughtErrors: false });
		let mockErrorHandler = vi.fn();
		AppContext.setErrorHandler(mockErrorHandler);
		renderTestView(view);
		expect(clickOutputAsync({ source: view.findViewContent(UICell)[0]! }))
			.resolves;
		await new Promise((r) => setTimeout(r, 10));
		expect(mockErrorHandler).toHaveBeenCalled();
	});

	test("Remove view after rendering", async () => {
		const MyView = CustomViewBuilder(CustomView, () => UI.Cell());
		let view = MyView.create();
		let app = useTestContext();
		let rendered = app.render(view);
		await app.renderer.expectOutputAsync({
			type: "cell",
			source: view.findViewContent(UICell)[0]!,
		});
		await rendered.removeAsync();
		app.renderer.expectOutput({ type: "cell" }).toBeEmpty();
	});

	test("View is not rendered twice", async () => {
		const view = new UICell();
		view.content.add(new UILabel("Test"));
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
				let view = new UICell();
				view.content.add(new UILabel("foo"));
				return view;
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
			options.items.push({ divider: true });
			options.items.push({ key: "two", text: "Two", hint: "2" });
			options.width = 200;
		});

		// click the label 'Two' inside of a row with accessibleRole 'menuitem':
		await clickOutputAsync({ accessibleRole: "menuitem" }, { text: "Two" });
		let result = await p;
		expect(result).toBe("two");
	});
});
