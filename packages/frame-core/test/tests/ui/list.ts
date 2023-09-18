import {
	bound,
	ManagedList,
	ManagedObject,
	app,
	UILabel,
	UIList,
	UIRow,
	UICell,
	UIButton,
} from "../../../dist/index.js";
import {
	describe,
	test,
	expect,
	useTestContext,
} from "@desk-framework/frame-test";

describe("UIList", (scope) => {
	scope.beforeEach(() => {
		useTestContext((options) => {
			options.renderFrequency = 5;
		});
	});

	// helper function to get the text content of a list
	function getListText(list: UIList) {
		return list.body.content.map((c) =>
			String(
				c instanceof UIList.ItemController
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
		let list = new UIList();
		expect(list.items).toBeUndefined();
		expect(list.firstIndex).toBe(0);
		expect(list.maxItems).toBeUndefined();
	});

	test("Empty list, rendered", async (t) => {
		let MyList = UIList.with({}, UILabel);
		app.render(new MyList());
		await t.expectOutputAsync(50, { type: "column" });
	});

	test("List of labels from ManagedList, rendered", async (t) => {
		let list = new ManagedList(...getObjects());

		t.log("Creating instance");
		let MyList = UIList.with(
			{ items: list },
			UILabel.withText(bound("item.name")),
			UIRow,
		);
		let instance = new MyList();

		t.log("Rendering");
		app.render(instance);
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
				this.observeAttach("view");
			}
			declare view?: UIList;
			array = ["a", "b", "c"];
		}
		let MyList = UIList.with(
			{ items: bound("array") },
			UILabel.withText(bound("item")),
			UIRow,
		);
		let instance = new MyList();
		let parent = new ArrayProvider();
		parent.view = instance;

		t.log("Rendering");
		app.render(instance);
		await t.expectOutputAsync(50, { type: "row" });
		expect(getListText(instance)).toBeArray(["a", "b", "c"]);
	});

	test("List of labels, rendered, then updated", async (t) => {
		let [a, b, c, d] = getObjects();
		let list = new ManagedList(a, b, c);

		t.log("Creating instance");
		let MyList = UIList.with(
			{ items: list, animation: { duration: 100 } },
			UILabel.withText(bound("item.name")),
			UIRow,
		);
		let instance = new MyList();

		t.log("Rendering");
		app.render(instance);
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
		let Preset = UIRow.with(
			UIList.with(
				{ items: new ManagedList(...getObjects()) },
				UILabel.with({ text: bound("item.name"), onClick: "Foo" }),
				UIRow,
			),
		);

		t.log("Creating view");
		let view = new Preset();
		view.listen((event) => {
			if (event.name === "Foo") {
				t.count("foo");
				if (!(event.delegate instanceof UIList.ItemController))
					t.fail("Wrong delegate type");
				let delegate = event.delegate as UIList.ItemController<NamedObject>;
				t.count(delegate.item.name);
			}
		});

		t.log("Rendering");
		app.render(view);
		let out = await t.expectOutputAsync(50, { text: "d" });

		t.log("Clicking");
		out.getSingle().click();
		t.expectCount("foo").toBe(1);
		t.expectCount("d").toBe(1);
	});

	test("Bookend", async (t) => {
		t.log("Creating instance");
		let MyList = UIList.with(
			{ items: new ManagedList(...getObjects()) },
			UILabel.withText(bound("item.name")),
			UIRow,
			UILabel.withText("end"),
		);
		let instance = new MyList();

		t.log("Rendering");
		app.render(instance);
		await t.expectOutputAsync(50, { type: "row" }, { text: "d" });
		expect(getListText(instance)).toBeArray(["a", "b", "c", "d", "end"]);

		t.log("Update");
		instance.items = new ManagedList(...[...getObjects()].reverse());
		await t.expectOutputAsync(50, { type: "row" });
		expect(getListText(instance)).toBeArray(["d", "c", "b", "a", "end"]);
	});

	test("Pagination", async (t) => {
		t.log("Creating instance");
		let MyList = UIList.with(
			{ items: new ManagedList(...getObjects()), maxItems: 2 },
			UILabel.withText(bound("item.name")),
			UIRow,
		);
		let instance = new MyList();

		t.log("Rendering 0-1");
		app.render(instance);
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
		let Preset = UIList.with(
			{ items: new ManagedList(...getObjects()) },
			UILabel.with({ text: bound("item.name"), allowFocus: true }),
		);
		let list = new Preset();
		app.render(list);
		let out = await t.expectOutputAsync(50, { text: "a" });
		expect(list.getIndexOfView(out.getSingle().output!.source)).toBe(0);
		out = await t.expectOutputAsync(50, { text: "d" });
		expect(list.getIndexOfView(out.getSingle().output!.source)).toBe(3);
		expect(list.getIndexOfView(list)).toBe(-1);
	});

	test("Request focus on list focuses previous item", async (t) => {
		let Preset = UICell.with(
			UIButton.withLabel("button"),
			UIList.with(
				{ items: new ManagedList(...getObjects()), allowKeyboardFocus: true },
				UILabel.with({ text: bound("item.name"), allowFocus: true }),
			),
		);
		app.render(new Preset());
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
		let Preset = UIList.with(
			{ items: new ManagedList(...getObjects()), allowKeyboardFocus: true },
			UILabel.with({
				text: bound("item.name"),
				allowFocus: true,
				onArrowDownKeyPress: "FocusNext",
				onArrowUpKeyPress: "FocusPrevious",
			}),
		);
		let list = new Preset();
		app.render(list);
		let firstOut = await t.expectOutputAsync(100, { text: "a" });

		t.log("Focus first item");
		let aElt = firstOut.getSingle();
		aElt.click();
		expect(aElt.hasFocus()).toBeTruthy();
		expect(list.focusPreviousItem()).toBeFalsy();

		t.log("Move focus down by 2");
		firstOut.getSingleComponent(UILabel).emit("ArrowDownKeyPress");
		await t.expectOutputAsync(100, { text: "b", focused: true });
		list.focusNextItem();
		let thirdOut = await t.expectOutputAsync(100, { text: "c", focused: true });

		t.log("Move focus up again");
		thirdOut.getSingleComponent(UILabel).emit("ArrowUpKeyPress");
		await t.expectOutputAsync(100, { text: "b", focused: true });
	});

	// TODO(tests): arrow key focus on nested lists
});
