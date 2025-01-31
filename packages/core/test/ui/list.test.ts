import {
	clickOutputAsync,
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import {
	$bind,
	$list,
	ManagedList,
	ManagedObject,
	UILabel,
	UIListView,
	UIListViewEvent,
	ui,
} from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

// helper function to get the text content of a list
function getListText(list: UIListView) {
	return list
		.getContent()!
		.map((c) =>
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

test("Empty list, rendered", async () => {
	let myList = ui.list({}, ui.label("foo"));
	renderTestView(myList.create());
	await expectOutputAsync({ type: "column" });
});

test("List of labels from ManagedList, rendered", async () => {
	let list = new ManagedList(...getObjects());

	console.log("Creating instance");
	let myList = ui.list(
		{ items: list },
		ui.label($list.string("item.name")),
		ui.row(),
	);
	let instance = myList.create();

	console.log("Rendering");
	renderTestView(instance);
	let out = await expectOutputAsync({ type: "row" });
	expect(out.elements[0], "row element").toBeDefined();
	out.containing({ text: "a" }).toBeRendered("list element a");
	out.containing({ text: "b" }).toBeRendered("list element b");
	out.containing({ text: "c" }).toBeRendered("list element c");
	expect(getListText(instance)).toEqual(["a", "b", "c", "d"]);

	console.log("Unlinking");
	instance.unlink();
	expect(instance.body).toBeUndefined();
});

test("List of labels from bound array, rendered", async () => {
	console.log("Creating instance");
	let myList = ui.list(
		{ items: $bind("array") },
		ui.label($list("item")),
		ui.row(),
	);
	class ArrayProvider extends ManagedObject {
		array = ["a", "b", "c"];
		readonly view = this.attach(myList.create());
	}
	let parent = new ArrayProvider();
	let instance = parent.view;

	console.log("Rendering");
	renderTestView(instance);
	await expectOutputAsync({ type: "row" });
	expect(getListText(instance)).toEqual(["a", "b", "c"]);
});

test("List of labels, rendered, then updated", async () => {
	let [a, b, c, d] = getObjects();
	let list = new ManagedList(a, b, c);

	console.log("Creating instance");
	let myList = ui.list(
		{ items: list },
		ui.label($list.string("item.name")),
		ui.row(),
	);
	let instance = myList.create();

	console.log("Rendering");
	renderTestView(instance);
	let out = await expectOutputAsync({ type: "row" }, { text: "c" });
	let cRendered = out.getSingle();

	console.log("Updating list");
	list.replaceAll([c, b, d]);
	await expectOutputAsync({ text: "d" });
	expect(getListText(instance)).toEqual(["c", "b", "d"]);
	let sameC = await expectOutputAsync({ type: "row" }, { text: "c" });
	expect(sameC.getSingle()).toBe(cRendered);
});

test("Event propagation through list", async () => {
	console.log("Creating view");
	let view = ui
		.row(
			ui.list(
				{ items: new ManagedList(...getObjects()) },
				ui.label($list.string("item.name"), { onClick: "Foo" }),
				ui.row(),
			),
		)
		.create();
	let count = 0;
	view.listen((event) => {
		if (event.name === "Foo") {
			count++;
			let delegate = event.findDelegate(
				UIListView.ItemControllerView<NamedObject>,
			);
			if (!delegate || !(delegate instanceof UIListView.ItemControllerView)) {
				return expect.fail("Invalid event delegate");
			}
			let data = (event as UIListViewEvent).data;
			let item = data.listViewItem;
			if (!item || !(item instanceof NamedObject)) {
				return expect.fail("Invalid item object");
			}
			if (item !== delegate.item) {
				return expect.fail("Not the same item object");
			}
			expect(item.name).toBe("d");
		}
	});

	console.log("Rendering");
	renderTestView(view);
	let out = await expectOutputAsync({ text: "d" });

	console.log("Clicking");
	out.getSingle().click();
	expect(count).toBe(1);
});

test("Bookend", async () => {
	console.log("Creating instance");
	let myList = ui.list(
		{ items: new ManagedList(...getObjects()) },
		ui.label($list.string("item.name")),
		ui.row(),
		ui.label("end"),
	);
	let instance = myList.create();

	console.log("Rendering");
	renderTestView(instance);
	await expectOutputAsync({ type: "row" }, { text: "d" });
	expect(getListText(instance)).toEqual(["a", "b", "c", "d", "end"]);

	console.log("Update");
	instance.items = new ManagedList(...[...getObjects()].reverse());
	await expectOutputAsync({ type: "row" });
	expect(getListText(instance)).toEqual(["d", "c", "b", "a", "end"]);
});

test("Pagination", async () => {
	console.log("Creating instance");
	let myList = ui.list(
		{ items: new ManagedList(...getObjects()), maxItems: 2 },
		ui.label($list.string("item.name")),
		ui.row(),
	);
	let instance = myList.create();

	console.log("Rendering 0-1");
	renderTestView(instance);
	await expectOutputAsync({ type: "row" });
	expect(getListText(instance)).toEqual(["a", "b"]);

	console.log("Moving window 1-2");
	instance.firstIndex = 1;
	await expectOutputAsync({ type: "row" }, { text: "c" });
	expect(getListText(instance)).toEqual(["b", "c"]);

	console.log("Moving window 3-X");
	instance.firstIndex = 3;
	instance.maxItems = -1;
	await expectOutputAsync({ type: "row" }, { text: "d" });
	expect(getListText(instance)).toEqual(["d"]);

	console.log("Moving window past end");
	instance.firstIndex = 4;
	await expectOutputAsync({ type: "row" });
	expect(getListText(instance)).toEqual([]);

	console.log("Moving before 0");
	instance.firstIndex = -1;
	await expectOutputAsync({ type: "row" }, { text: "d" });
	expect(getListText(instance)).toEqual(["a", "b", "c", "d"]);
});

test("Get indices for components", async () => {
	let myList = ui.list(
		{ items: new ManagedList(...getObjects()) },
		ui.label($list.string("item.name"), { allowFocus: true }),
	);
	let list = myList.create();
	renderTestView(list);
	let out = await expectOutputAsync({ text: "a" });
	expect(list.getIndexOfView(out.getSingle().output!.source)).toBe(0);
	out = await expectOutputAsync({ text: "d" });
	expect(list.getIndexOfView(out.getSingle().output!.source)).toBe(3);
	expect(list.getIndexOfView(list)).toBe(-1);
});

test("Request focus on list focuses previous item", async () => {
	let myList = ui.cell(
		ui.button("button"),
		ui.list(
			{ items: new ManagedList(...getObjects()) },
			ui.label($list.string("item.name"), { allowFocus: true }),
			ui.cell({ allowKeyboardFocus: true, accessibleRole: "list" }),
		),
	);
	renderTestView(myList.create());
	let out = await expectOutputAsync({ text: "a" });

	console.log("Focus first item");
	out.getSingle().click();
	await expectOutputAsync({ text: "a", focused: true });

	console.log("Focus other item");
	await clickOutputAsync({ type: "button" });

	console.log("Focus list again");
	(await expectOutputAsync({ accessibleRole: "list" })).getSingle().focus();
	await expectOutputAsync({ text: "a", focused: true });
});

test("Arrow key focus, single list", async () => {
	let myList = ui.list(
		{ items: new ManagedList(...getObjects()) },
		ui.label({
			text: $list.string("item.name"),
			allowFocus: true,
			onArrowDownKeyPress: "FocusNext",
			onArrowUpKeyPress: "FocusPrevious",
		}),
	);
	let list = myList.create();
	renderTestView(list);
	let firstOut = await expectOutputAsync({ text: "a" });

	console.log("Focus first item");
	let aElt = firstOut.getSingle();
	aElt.click();
	expect(aElt.hasFocus()).toBeTruthy();
	expect(list.focusPreviousItem()).toBeFalsy();

	console.log("Move focus down by 2");
	firstOut.getSingleView(UILabel).emit("ArrowDownKeyPress");
	await expectOutputAsync({ text: "b", focused: true });
	list.focusNextItem();
	let thirdOut = await expectOutputAsync({ text: "c", focused: true });

	console.log("Move focus up again");
	thirdOut.getSingleView(UILabel).emit("ArrowUpKeyPress");
	await expectOutputAsync({ text: "b", focused: true });
});

// TODO(tests): arrow key focus on nested lists
