import {
	Observer,
	app,
	UILabel,
	UIScrollContainer,
} from "../../../dist/index.js";
import {
	describe,
	test,
	expect,
	useTestContext,
} from "@desk-framework/frame-test";

describe("UIScrollContainer", (scope) => {
	scope.beforeEach(() => {
		useTestContext((options) => {
			options.renderFrequency = 5;
		});
	});

	test("Constructor", () => {
		let cont = new UIScrollContainer();
		cont.content.add(new UILabel("foo"));
		expect(cont.horizontalScrollEnabled).toBe(true);
		expect(cont.verticalScrollEnabled).toBe(true);
		expect(cont.content).toHaveProperty("count").toBe(1);
	});

	test("Preset with properties", () => {
		let MyContainer = UIScrollContainer.with({
			horizontalScrollEnabled: false,
			verticalScrollEnabled: true,
		});
		let cont = new MyContainer();
		expect(cont).toHaveProperty("horizontalScrollEnabled").toBeFalsy();
		expect(cont).toHaveProperty("verticalScrollEnabled").toBeTruthy();
	});

	test("Scroll target events", (t) => {
		let cont = new UIScrollContainer();

		// use an observer to capture events
		class MyObserver extends Observer<UIScrollContainer> {
			onUIScrollTarget() {
				t.count("event");
			}
		}
		new MyObserver().observe(cont);
		cont.scrollTo(0, 0);
		cont.scrollToTop();
		cont.scrollToBottom();
		t.expectCount("event").toBe(3);
	});

	test("Rendered as container", async (t) => {
		let cont = new UIScrollContainer();
		cont.content.add(new UILabel("foo"));
		app.render(cont);
		await t.expectOutputAsync(50, { type: "container" }, { text: "foo" });
	});
});
