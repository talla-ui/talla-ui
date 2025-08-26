import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import {
	UILabel,
	UIScrollView,
	UI,
	UIColumn,
	UIRow,
} from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

test("Constructor", () => {
	let scrollView = new UIScrollView();
	scrollView.content.add(new UILabel("foo"));
	expect(scrollView.horizontalScroll).toBe(true);
	expect(scrollView.verticalScroll).toBe(true);
	expect(scrollView.content).toHaveProperty("length", 1);
});

test("Scroll target events", () => {
	let count = 0;
	let scrollView = new UIScrollView();
	scrollView.listen((e) => {
		if (e.name === "UIScrollTarget") count++;
	});
	scrollView.scrollTo(0, 0);
	scrollView.scrollToTop();
	scrollView.scrollToBottom();
	expect(count).toBe(3);
});

test("Rendered as container", async () => {
	let scrollView = new UIScrollView();
	scrollView.content.add(new UILabel("foo"));
	renderTestView(scrollView);
	await expectOutputAsync({ type: "container" }, { text: "foo" });
});

test("View builder with properties", () => {
	let myScrollView = UI.Column(UI.Label("content"))
		.scroll()
		.horizontalScroll(false)
		.verticalScroll(true)
		.topThreshold(10)
		.bottomThreshold(20)
		.horizontalThreshold(5);
	let scrollView = myScrollView.create();
	expect(scrollView.content).toHaveProperty("length", 1);
	expect(scrollView).toHaveProperty("horizontalScroll", false);
	expect(scrollView).toHaveProperty("verticalScroll", true);
	expect(scrollView.topThreshold).toBe(10);
	expect(scrollView.bottomThreshold).toBe(20);
	expect(scrollView.horizontalThreshold).toBe(5);
});

test("Scrollable row with content", () => {
	let myScrollView = UI.Row(UI.Label("A"), UI.Label("B")).scroll();
	let scrollView = myScrollView.create();
	expect(scrollView.content).toHaveProperty("length", 1);
	let row = scrollView.content.first() as UIRow;
	expect(row).toBeInstanceOf(UIRow);
	expect(row.content).toHaveProperty("length", 2);
});

test("Adding content to container using scroll builder with()", () => {
	let myScrollView = UI.Column().scroll().with(UI.Label("Added content"));
	let scrollView = myScrollView.create();
	expect(scrollView.content).toHaveProperty("length", 1);
	let column = scrollView.content.first() as UIColumn;
	expect(column.content.first()).toBeInstanceOf(UILabel);
});

test("Rendered scrollable column", async () => {
	let myScrollView = UI.Column(UI.Label("Scrollable content")).scroll();
	renderTestView(myScrollView.create());
	await expectOutputAsync(
		{ type: "container" },
		{ type: "column" },
		{ text: "Scrollable content" },
	);
});

test("Rendered scrollable row", async () => {
	let myScrollView = UI.Row(UI.Label("A"), UI.Label("B")).scroll();
	renderTestView(myScrollView.create());
	await expectOutputAsync(
		{ type: "container" },
		{ type: "row" },
		{ text: "A" },
	);
});
