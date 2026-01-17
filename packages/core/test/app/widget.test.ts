import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import { UI, Widget } from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

test("Widget.builder creates view with binding", async () => {
	class CounterWidget extends Widget {
		count = 0;
	}
	let view = CounterWidget.builder((v) => UI.Text(v.bind("count"))).build();
	expect(view).toBeInstanceOf(CounterWidget);
	renderTestView(view);
	await expectOutputAsync({ text: "0" });
	view.count = 5;
	await expectOutputAsync({ text: "5" });
});

test("Widget.builder with extend adds custom methods", async () => {
	class MessageWidget extends Widget {
		text = "";
	}
	function Message() {
		return MessageWidget.builder((v) => UI.Text(v.bind("text"))).extend({
			text(value: string) {
				this.initializer.set("text", value);
				return this;
			},
		});
	}
	let view = Message().text("Hello").build();
	expect(view.text).toBe("Hello");
	renderTestView(view);
	await expectOutputAsync({ text: "Hello" });
});

test("Widget.builder with extend and defer", async () => {
	class CollapsibleWidget extends Widget {
		expanded = false;
		deferSet = false;
	}
	function Collapsible(title: string) {
		return CollapsibleWidget.builder((v) =>
			UI.Column(
				UI.Text(title),
				UI.ShowWhen(v.bind("expanded"), UI.Text("Content")),
			),
		).extend(
			{
				expand(set = true) {
					this.initializer.set("expanded", set);
					return this;
				},
				test() {
					this.initializer.set("deferSet", true);
					return this;
				},
			},
			(b) => {
				b.test();
			},
		);
	}
	let view = Collapsible("Title").expand().build();
	expect(view.expanded).toBe(true);
	expect(view.deferSet).toBe(true);
	renderTestView(view);
	await expectOutputAsync({ text: "Title" });
	await expectOutputAsync({ text: "Content" });
});

test("Widget.builder without defineView uses class body getter", async () => {
	class CustomWidget extends Widget {
		label = "default";
		protected override get body() {
			return UI.Text(this.label).build();
		}
	}
	let view = CustomWidget.builder().build();
	view.label = "custom";
	expect(view).toBeInstanceOf(CustomWidget);
	renderTestView(view);
	await expectOutputAsync({ text: "custom" });
});
