import {
	clickOutputAsync,
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import {
	bind,
	ObservableList,
	ObservableObject,
	UI,
	UILabel,
	UIListView,
	UIListViewEvent,
} from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

// helper function to get the text content of a list
function getListText(list: UIListView) {
	return list.getContent()!.map((c) => {
		let itemView =
			c instanceof UIListView.ItemControllerView ? c.getListItemView() : c;
		return itemView instanceof UILabel ? itemView.text : "";
	});
}

// helper function to get a list of observable objects
function getObjects() {
	return [
		new NamedObject("a"),
		new NamedObject("b"),
		new NamedObject("c"),
		new NamedObject("d"),
	] as const;
}

class NamedObject extends ObservableObject {
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
	let myList = UI.List([], UI.Label("foo"));
	renderTestView(myList.create());
	await expectOutputAsync({ type: "column" });
});

test("List of labels from ObservableList, rendered", async () => {
	let list = new ObservableList(...getObjects());

	console.log("Creating instance");
	let myList = UI.List(list, (item) => UI.Label(item.bind("name")));
	let instance = myList.create();

	console.log("Rendering");
	renderTestView(instance);
	let out = await expectOutputAsync({ type: "column" });
	expect(out.elements[0], "row element").toBeDefined();
	out.containing({ text: "a" }).toBeRendered("list element a");
	out.containing({ text: "b" }).toBeRendered("list element b");
	out.containing({ text: "c" }).toBeRendered("list element c");
	expect(getListText(instance)).toEqual(["a", "b", "c", "d"]);

	console.log("Unlinking");
	instance.unlink();
	expect((instance as any).body.isUnlinked()).toBeTruthy();
});

test("List of labels from bound array, rendered", async () => {
	console.log("Creating instance");
	let myList = UI.List(bind("array"), (item) => UI.Label(item)).outer(UI.Row());
	class ArrayProvider extends ObservableObject {
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
	let list = new ObservableList(a, b, c);

	console.log("Creating instance");
	let myList = UI.List(list, (item) => UI.Label(item.bind("name"))).outer(
		UI.Row(),
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

test("List of labels, rendered, then updated, with scroll view", async () => {
	let [a, b, c, d] = getObjects();
	let list = new ObservableList(a, b, c);

	console.log("Creating instance");
	let myList = UI.List(list, UI.Label(bind("item.name"))).outer(
		UI.Row().scroll(),
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
	let view = UI.Row(
		UI.List(
			new ObservableList(...getObjects()),
			UI.Label(bind("item.name")).intercept("Click", "Foo"),
		),
	).create();
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

test("Nested list", async () => {
	console.log("Creating instance");
	class NestedArrayProvider extends ObservableObject {
		array = [
			{ name: "a", numbers: [1, 2, 3] },
			{ name: "b", numbers: [4, 5, 6] },
			{ name: "c", numbers: [7, 8, 9] },
		];
		readonly view = this.attach(
			UI.List(bind<{ name: string; numbers: number[] }[]>("array"), (item) =>
				UI.List(item.bind("numbers"), (number) =>
					UI.Label.fmt("{}{}", item.bind("name"), number),
				),
			).create(),
		);
	}
	let parent = new NestedArrayProvider();
	let instance = parent.view;

	console.log("Rendering");
	renderTestView(instance);
	await expectOutputAsync({ type: "label" });
	let labels = instance
		.findViewContent(UILabel)
		.map((label) => String(label.text));
	console.log(`Rendered ${labels.length} labels`);
	expect(labels).toEqual([
		"a1",
		"a2",
		"a3",
		"b4",
		"b5",
		"b6",
		"c7",
		"c8",
		"c9",
	]);
});

test("Empty state", async () => {
	console.log("Creating instance");
	let myList = UI.List(new ObservableList(...getObjects()))
		.with(UI.Label(bind("item.name")))
		.emptyState(UI.Label("empty"));
	let instance = myList.create();

	console.log("Rendering");
	renderTestView(instance);
	await expectOutputAsync({ type: "column" }, { text: "d" });
	expect(getListText(instance)).toEqual(["a", "b", "c", "d"]);

	console.log("Update");
	instance.items = new ObservableList();
	await expectOutputAsync({ type: "column" });
	expect(getListText(instance)).toEqual(["empty"]);
	instance.items.add(new NamedObject("e"));
	await expectOutputAsync({ type: "column" });
	expect(getListText(instance)).toEqual(["e"]);
});

test("Pagination", async () => {
	console.log("Creating instance");
	let myList = UI.List(new ObservableList(...getObjects()))
		.with(UI.Label(bind("item.name")))
		.outer(UI.Row())
		.bounds(0, 2);
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

test("Get indices for elements", async () => {
	let myList = UI.List(
		new ObservableList(...getObjects()),
		UI.Label(bind("item.name")).allowFocus(true),
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
	let myList = UI.Cell(
		UI.Button("button"),
		UI.List(new ObservableList(...getObjects()))
			.with(UI.Label(bind("item.name")).allowFocus(true))
			.outer(UI.Cell().allowKeyboardFocus()),
	);
	renderTestView(myList.create());
	let out = await expectOutputAsync({ text: "a" });

	console.log("Focus first item");
	out.getSingle().click();
	await expectOutputAsync({ text: "a", focused: true });

	console.log("Focus other item");
	await clickOutputAsync({ type: "button" });

	console.log("Focus list again");
	(await expectOutputAsync({ type: "cell", accessibleRole: "list" }))
		.getSingle()
		.focus();
	await expectOutputAsync({ text: "a", focused: true });
});

test("Arrow key focus, single list", async () => {
	let myList = UI.List(
		new ObservableList(...getObjects()),
		UI.Label(bind("item.name"))
			.allowFocus()
			.intercept("ArrowDownKeyPress", "FocusNext")
			.intercept("ArrowUpKeyPress", "FocusPrevious"),
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
