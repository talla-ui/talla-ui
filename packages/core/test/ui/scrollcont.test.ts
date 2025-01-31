import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import { UILabel, UIScrollContainer, ui } from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

test("Constructor", () => {
	let cont = new UIScrollContainer();
	cont.content.add(new UILabel("foo"));
	expect(cont.horizontalScrollEnabled).toBe(true);
	expect(cont.verticalScrollEnabled).toBe(true);
	expect(cont.content).toHaveProperty("count", 1);
});

test("View builder with properties", () => {
	let myContainer = ui.scroll({
		horizontalScrollEnabled: false,
		verticalScrollEnabled: true,
	});
	let cont = myContainer.create();
	expect(cont).toHaveProperty("horizontalScrollEnabled", false);
	expect(cont).toHaveProperty("verticalScrollEnabled", true);
});

test("Scroll target events", () => {
	let count = 0;
	let cont = new UIScrollContainer();
	cont.listen((e) => {
		if (e.name === "UIScrollTarget") count++;
	});
	cont.scrollTo(0, 0);
	cont.scrollToTop();
	cont.scrollToBottom();
	expect(count).toBe(3);
});

test("Rendered as container", async () => {
	let cont = new UIScrollContainer();
	cont.content.add(new UILabel("foo"));
	renderTestView(cont);
	await expectOutputAsync({ type: "container" }, { text: "foo" });
});
