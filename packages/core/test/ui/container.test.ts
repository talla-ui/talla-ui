import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, describe, expect, test } from "vitest";
import { UI, UIColumn, UIRow } from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

describe("Container focus", () => {
	test("allowFocus() sets allowFocus but not allowKeyboardFocus", () => {
		let column = UI.Column().allowFocus().build();
		expect(column.allowFocus).toBe(true);
		expect(column.allowKeyboardFocus).toBeFalsy();
	});

	test("allowFocus(false) disables focus", () => {
		let column = UI.Column().allowFocus().allowFocus(false).build();
		expect(column.allowFocus).toBe(false);
	});

	test("allowKeyboardFocus() sets both focus properties", () => {
		let column = UI.Column().allowKeyboardFocus().build();
		expect(column.allowFocus).toBe(true);
		expect(column.allowKeyboardFocus).toBe(true);
	});

	test("allowKeyboardFocus(false) disables keyboard focus but keeps allowFocus", () => {
		let column = UI.Column()
			.allowKeyboardFocus()
			.allowKeyboardFocus(false)
			.build();
		expect(column.allowFocus).toBe(true);
		expect(column.allowKeyboardFocus).toBe(false);
	});

	test("Focus methods work on both Row and Column", () => {
		let column = UI.Column().allowKeyboardFocus().build();
		let row = UI.Row().allowKeyboardFocus().build();
		expect(column).toBeInstanceOf(UIColumn);
		expect(row).toBeInstanceOf(UIRow);
		expect(column.allowKeyboardFocus).toBe(true);
		expect(row.allowKeyboardFocus).toBe(true);
	});

	test("Focusable container renders with focusable flag", async () => {
		let column = UI.Column().allowKeyboardFocus().build();
		renderTestView(column);
		let out = await expectOutputAsync({ type: "column" });
		expect(out.getSingle().focusable).toBe(true);
	});
});

describe("Container hover tracking", () => {
	test("trackHover() enables hover tracking", () => {
		let column = UI.Column().trackHover().build();
		expect(column.trackHover).toBe(true);
	});

	test("trackHover(false) disables hover tracking", () => {
		let column = UI.Column().trackHover().trackHover(false).build();
		expect(column.trackHover).toBe(false);
	});

	test("trackHover works on both Row and Column", () => {
		let column = UI.Column().trackHover().build();
		let row = UI.Row().trackHover().build();
		expect(column.trackHover).toBe(true);
		expect(row.trackHover).toBe(true);
	});

	test("isHovered() returns false when not rendered", () => {
		let column = UI.Column().trackHover().build();
		expect(column.isHovered()).toBe(false);
	});

	test("isHovered() requires trackHover to be enabled", async () => {
		let column = UI.Column().build();
		renderTestView(column);
		let out = await expectOutputAsync({ type: "column" });
		out.getSingle().sendPlatformEvent("mouseenter");
		expect(column.isHovered()).toBe(false);
	});

	test("isHovered() tracks mouse enter and leave", async () => {
		let column = UI.Column().trackHover().build();
		renderTestView(column);
		let out = await expectOutputAsync({ type: "column" });

		expect(column.isHovered()).toBe(false);
		out.getSingle().sendPlatformEvent("mouseenter");
		expect(column.isHovered()).toBe(true);
		out.getSingle().sendPlatformEvent("mouseleave");
		expect(column.isHovered()).toBe(false);
	});

	test("onMouseEnter auto-enables trackHover", () => {
		let column = UI.Column().onMouseEnter("Entered").build();
		expect(column.trackHover).toBe(true);
	});

	test("onMouseLeave auto-enables trackHover", () => {
		let column = UI.Column().onMouseLeave("Left").build();
		expect(column.trackHover).toBe(true);
	});

	test("onMouseEnter handler is called on mouseenter", async () => {
		let entered = false;
		let column = UI.Column()
			.onMouseEnter(() => {
				entered = true;
			})
			.build();
		renderTestView(column);
		let out = await expectOutputAsync({ type: "column" });

		out.getSingle().sendPlatformEvent("mouseenter");
		expect(entered).toBe(true);
	});

	test("onMouseLeave handler is called on mouseleave", async () => {
		let left = false;
		let column = UI.Column()
			.onMouseLeave(() => {
				left = true;
			})
			.build();
		renderTestView(column);
		let out = await expectOutputAsync({ type: "column" });

		out.getSingle().sendPlatformEvent("mouseenter");
		out.getSingle().sendPlatformEvent("mouseleave");
		expect(left).toBe(true);
	});
});

describe("Container .flex() method", () => {
	test("flex() sets grow and shrink defaults", () => {
		let column = UI.Column().flex().build();
		expect(column.style?.flexGrow).toBe(1);
		expect(column.style?.flexShrink).toBe(1);
	});

	test("flex() works on both Row and Column", () => {
		let column = UI.Column().flex().build();
		let row = UI.Row().flex().build();
		expect(column.style?.flexGrow).toBe(1);
		expect(row.style?.flexGrow).toBe(1);
	});

	test("flex() accepts custom grow and shrink values", () => {
		let column = UI.Column().flex(2, 0).build();
		expect(column.style?.flexGrow).toBe(2);
		expect(column.style?.flexShrink).toBe(0);
	});

	test("flex(0, 1) sets shrink-only behavior", () => {
		let column = UI.Column().flex(0, 1).build();
		expect(column.style?.flexGrow).toBe(0);
		expect(column.style?.flexShrink).toBe(1);
	});

	test("flex() renders correctly", async () => {
		let column = UI.Column(UI.Text("Content")).flex().build();
		renderTestView(column);
		let out = await expectOutputAsync({ type: "column" });
		expect(out.getSingle().style?.flexGrow).toBe(1);
	});

	test("flex() can be combined with focus and hover", () => {
		let column = UI.Column().flex().allowKeyboardFocus().trackHover().build();
		expect(column.style?.flexGrow).toBe(1);
		expect(column.allowKeyboardFocus).toBe(true);
		expect(column.trackHover).toBe(true);
	});
});

describe("Container .centerContent() method", () => {
	test("centerContent() sets both gravity and distribution to center", () => {
		let column = UI.Column().centerContent().build();
		expect(column.layout?.gravity).toBe("center");
		expect(column.layout?.distribution).toBe("center");
	});

	test("flex() and centerContent() can be combined", () => {
		let column = UI.Column().flex().centerContent().build();
		expect(column.style?.flexGrow).toBe(1);
		expect(column.layout?.gravity).toBe("center");
		expect(column.layout?.distribution).toBe("center");
	});
});

describe("Position zIndex property", () => {
	test("position() accepts zIndex in object form", () => {
		let column = UI.Column().position({ zIndex: 50 }).build();
		expect(column.position?.zIndex).toBe(50);
	});

	test("position() combines gravity with zIndex", () => {
		let column = UI.Column()
			.position({ gravity: "overlay", zIndex: 100 })
			.build();
		expect(column.position?.gravity).toBe("overlay");
		expect(column.position?.zIndex).toBe(100);
	});

	test("position() accepts all properties including zIndex", () => {
		let column = UI.Column()
			.position({ gravity: "overlay", top: 10, left: 20, zIndex: 5 })
			.build();
		expect(column.position?.gravity).toBe("overlay");
		expect(column.position?.top).toBe(10);
		expect(column.position?.left).toBe(20);
		expect(column.position?.zIndex).toBe(5);
	});

	test("zIndex can be zero", () => {
		let column = UI.Column().position({ zIndex: 0 }).build();
		expect(column.position?.zIndex).toBe(0);
	});

	test("zIndex works on different element types", () => {
		let column = UI.Column().position({ zIndex: 1 }).build();
		let row = UI.Row().position({ zIndex: 2 }).build();
		let button = UI.Button("Test").position({ zIndex: 3 }).build();
		expect(column.position?.zIndex).toBe(1);
		expect(row.position?.zIndex).toBe(2);
		expect(button.position?.zIndex).toBe(3);
	});

	test("zIndex renders correctly", async () => {
		let column = UI.Column().position({ zIndex: 10 }).build();
		renderTestView(column);
		let out = await expectOutputAsync({ type: "column" });
		expect(out.getSingle().position?.zIndex).toBe(10);
	});
});

describe("Combined container features", () => {
	test("Container with all interactive features", () => {
		let column = UI.Column(UI.Text("Content"))
			.flex()
			.centerContent()
			.allowKeyboardFocus()
			.trackHover()
			.build();

		// flex() properties
		expect(column.style?.flexGrow).toBe(1);
		expect(column.style?.flexShrink).toBe(1);

		// centerContent() layout
		expect(column.layout?.gravity).toBe("center");
		expect(column.layout?.distribution).toBe("center");

		// focus and hover
		expect(column.allowKeyboardFocus).toBe(true);
		expect(column.trackHover).toBe(true);
	});

	test("Interactive container renders and responds to events", async () => {
		let mouseEntered = false;
		let column = UI.Column()
			.flex()
			.allowKeyboardFocus()
			.onMouseEnter(() => {
				mouseEntered = true;
			})
			.build();

		renderTestView(column);
		let out = await expectOutputAsync({ type: "column" });

		expect(out.getSingle().focusable).toBe(true);
		expect(out.getSingle().style?.flexGrow).toBe(1);

		out.getSingle().sendPlatformEvent("mouseenter");
		expect(mouseEntered).toBe(true);
		expect(column.isHovered()).toBe(true);
	});
});
