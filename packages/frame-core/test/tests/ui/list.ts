import {
	bound,
	ManagedList,
	ManagedObject,
	app,
	UILabel,
	UIListView,
	UIRow,
	ui,
} from "../../../dist/index.js";
import {
	describe,
	test,
	expect,
	useTestContext,
} from "@desk-framework/frame-test";

describe("UIListView", (scope) => {
	scope.beforeEach(() => {
		useTestContext((options) => {
			options.renderFrequency = 5;
		});
	});

	// helper function to get the text content of a list
	function getListText(list: UIListView) {
		return list.body.content.map((c) =>
			String(
				c instanceof UIListView.ItemControllerView
					? c.body instanceof UILabel && c.body.text
					: c instanceof UILabel && c.text,
			),
		);
	}

	// helper function to get a list of managed objects
	function getObjects() {
		return [
			new NamedObject("a"),
			new NamedObject("b"),
			new NamedObject("c"),
			new NamedObject("d"),
		] as const;
	}

	class NamedObject extends ManagedObject {
		constructor(public name: string) {
			super();
		}
		override valueOf() {
			return this.name;
		}
	}

	test("Constructor", () => {
		let list = new UIListView();
		expect(list.items).toBeUndefined();
		expect(list.firstIndex).toBe(0);
		expect(list.maxItems).toBeUndefined();
	});

	test("Empty list, rendered", async (t) => {
		let MyList = ui.list({}, UILabel);
		app.showPage(new MyList());
		await t.expectOutputAsync(50, { type: "column" });
	});

	test("List of labels from ManagedList, rendered", async (t) => {
		let list = new ManagedList(...getObjects());

		t.log("Creating instance");
		let MyList = ui.list({ items: list }, ui.label(bound("item.name")), UIRow);
		let instance = new MyList();

		t.log("Rendering");
		app.showPage(instance);
		let out = await t.expectOutputAsync(50, { type: "row" });
		expect(out.elements[0], "row element").toBeDefined();
		out.containing({ text: "a" }).toBeRendered("list element a");
		out.containing({ text: "b" }).toBeRendered("list element b");
		out.containing({ text: "c" }).toBeRendered("list element c");
		expect(getListText(instance)).toBeArray(["a", "b", "c", "d"]);

		t.log("Unlinking");
		instance.unlink();
		expect(instance.body).toBeUndefined();
	});

	test("List of labels from bound array, rendered", async (t) => {
		t.log("Creating instance");
		class ArrayProvider extends ManagedObject {
			constructor() {
				super();
				this.autoAttach("view");
			}
			declare view?: UIListView;
			array = ["a", "b", "c"];
		}
		let MyList = ui.list(
			{ items: bound("array") },
			ui.label(bound("item")),
			UIRow,
		);
		let instance = new MyList();
		let parent = new ArrayProvider();
		parent.view = instance;

		t.log("Rendering");
		app.showPage(instance);
		await t.expectOutputAsync(50, { type: "row" });
		expect(getListText(instance)).toBeArray(["a", "b", "c"]);
	});

	test("List of labels, rendered, then updated", async (t) => {
		let [a, b, c, d] = getObjects();
		let list = new ManagedList(a, b, c);

		t.log("Creating instance");
		let MyList = ui.list({ items: list }, ui.label(bound("item.name")), UIRow);
		let instance = new MyList();

		t.log("Rendering");
		app.showPage(instance);
		let out = await t.expectOutputAsync(50, { type: "row" }, { text: "c" });
		let cRendered = out.getSingle();

		t.log("Updating list");
		list.replace([c, b, d]);
		await t.expectOutputAsync(50, { text: "d" });
		expect(getListText(instance)).toBeArray(["c", "b", "d"]);
		let sameC = await t.expectOutputAsync(50, { type: "row" }, { text: "c" });
		expect(sameC.getSingle()).toBe(cRendered);
	});

	test("Event propagation through list", async (t) => {
		let Preset = ui.row(
			ui.list(
				{ items: new ManagedList(...getObjects()) },
				ui.label({ text: bound("item.name"), onClick: "Foo" }),
				UIRow,
			),
		);

		t.log("Creating view");
		let view = new Preset();
		view.listen((event) => {
			if (event.name === "Foo") {
				t.count("foo");
				if (!(event.delegate instanceof UIListView.ItemControllerView))
					t.fail("Wrong delegate type");
				let delegate =
					event.delegate as UIListView.ItemControllerView<NamedObject>;
				t.count(delegate.item.name);
			}
		});

		t.log("Rendering");
		app.showPage(view);
		let out = await t.expectOutputAsync(50, { text: "d" });

		t.log("Clicking");
		out.getSingle().click();
		t.expectCount("foo").toBe(1);
		t.expectCount("d").toBe(1);
	});

	test("Bookend", async (t) => {
		t.log("Creating instance");
		let MyList = ui.list(
			{ items: new ManagedList(...getObjects()) },
			ui.label(bound("item.name")),
			UIRow,
			ui.label("end"),
		);
		let instance = new MyList();

		t.log("Rendering");
		app.showPage(instance);
		await t.expectOutputAsync(50, { type: "row" }, { text: "d" });
		expect(getListText(instance)).toBeArray(["a", "b", "c", "d", "end"]);

		t.log("Update");
		instance.items = new ManagedList(...[...getObjects()].reverse());
		await t.expectOutputAsync(50, { type: "row" });
		expect(getListText(instance)).toBeArray(["d", "c", "b", "a", "end"]);
	});

	test("Pagination", async (t) => {
		t.log("Creating instance");
		let MyList = ui.list(
			{ items: new ManagedList(...getObjects()), maxItems: 2 },
			ui.label(bound("item.name")),
			UIRow,
		);
		let instance = new MyList();

		t.log("Rendering 0-1");
		app.showPage(instance);
		await t.expectOutputAsync(50, { type: "row" });
		expect(getListText(instance)).toBeArray(["a", "b"]);

		t.log("Moving window 1-2");
		instance.firstIndex = 1;
		await t.expectOutputAsync(50, { type: "row" }, { text: "c" });
		expect(getListText(instance)).toBeArray(["b", "c"]);

		t.log("Moving window 3-X");
		instance.firstIndex = 3;
		instance.maxItems = -1;
		await t.expectOutputAsync(50, { type: "row" }, { text: "d" });
		expect(getListText(instance)).toBeArray(["d"]);

		t.log("Moving window past end");
		instance.firstIndex = 4;
		await t.expectOutputAsync(50, { type: "row" });
		expect(getListText(instance)).toBeArray(0);

		t.log("Moving before 0");
		instance.firstIndex = -1;
		await t.expectOutputAsync(50, { type: "row" }, { text: "d" });
		expect(getListText(instance)).toBeArray(["a", "b", "c", "d"]);
	});

	test("Get indices for components", async (t) => {
		let Preset = ui.list(
			{ items: new ManagedList(...getObjects()) },
			ui.label({ text: bound("item.name"), allowFocus: true }),
		);
		let list = new Preset();
		app.showPage(list);
		let out = await t.expectOutputAsync(50, { text: "a" });
		expect(list.getIndexOfView(out.getSingle().output!.source)).toBe(0);
		out = await t.expectOutputAsync(50, { text: "d" });
		expect(list.getIndexOfView(out.getSingle().output!.source)).toBe(3);
		expect(list.getIndexOfView(list)).toBe(-1);
	});

	test("Request focus on list focuses previous item", async (t) => {
		let Preset = ui.cell(
			ui.button("button"),
			ui.list(
				{ items: new ManagedList(...getObjects()), allowKeyboardFocus: true },
				ui.label({ text: bound("item.name"), allowFocus: true }),
			),
		);
		app.showPage(new Preset());
		let out = await t.expectOutputAsync(50, { text: "a" });

		t.log("Focus first item");
		out.getSingle().click();
		await t.expectOutputAsync(50, { text: "a", focused: true });

		t.log("Focus other item");
		(await t.expectOutputAsync(50, { type: "button" })).getSingle().click();

		t.log("Focus list again");
		(await t.expectOutputAsync(50, { accessibleRole: "list" }))
			.getSingle()
			.focus();
		await t.expectOutputAsync(50, { text: "a", focused: true });
	});

	test("Arrow key focus, single list", async (t) => {
		let Preset = ui.list(
			{ items: new ManagedList(...getObjects()), allowKeyboardFocus: true },
			ui.label({
				text: bound("item.name"),
				allowFocus: true,
				onArrowDownKeyPress: "FocusNext",
				onArrowUpKeyPress: "FocusPrevious",
			}),
		);
		let list = new Preset();
		app.showPage(list);
		let firstOut = await t.expectOutputAsync(100, { text: "a" });

		t.log("Focus first item");
		let aElt = firstOut.getSingle();
		aElt.click();
		expect(aElt.hasFocus()).toBeTruthy();
		expect(list.focusPreviousItem()).toBeFalsy();

		t.log("Move focus down by 2");
		firstOut.getSingleView(UILabel).emit("ArrowDownKeyPress");
		await t.expectOutputAsync(100, { text: "b", focused: true });
		list.focusNextItem();
		let thirdOut = await t.expectOutputAsync(100, { text: "c", focused: true });

		t.log("Move focus up again");
		thirdOut.getSingleView(UILabel).emit("ArrowUpKeyPress");
		await t.expectOutputAsync(100, { text: "b", focused: true });
	});

	// TODO(tests): arrow key focus on nested lists
});
