import { app, ui, UIImage } from "../../../dist/index.js";
import {
	describe,
	expect,
	test,
	useTestContext,
} from "@desk-framework/frame-test";

describe("UIImage", (scope) => {
	scope.beforeEach(() => {
		useTestContext((options) => {
			options.renderFrequency = 5;
		});
	});

	test("Constructor with URL", () => {
		let image = new UIImage("foo.png");
		expect(image).toHaveProperty("url").asString().toBe("foo.png");
	});

	test("Preset using url", () => {
		let MyImage = ui.image("foo.png");
		let image = new MyImage();
		expect(image).toHaveProperty("url").asString().toBe("foo.png");
	});

	test("Preset with properties", () => {
		let MyImage = ui.image({ url: "foo.png" });
		let image = new MyImage();
		expect(image).toHaveProperty("url").asString().toBe("foo.png");
	});

	test("Focusable follows keyboard focusable", () => {
		let plainImage = new UIImage();
		expect(plainImage.allowFocus).toBeFalsy();
		expect(plainImage.allowKeyboardFocus).toBeFalsy();
		let focusableImage = new (ui.image({ allowKeyboardFocus: true }))();
		expect(focusableImage.allowFocus).toBeTruthy();
		expect(focusableImage.allowKeyboardFocus).toBeTruthy();
	});

	test("Rendered with image url", async (t) => {
		let MyImage = ui.image({
			url: "foo.png",
			accessibleLabel: "My image",
		});
		let image = new MyImage();
		app.showPage(image);
		await t.expectOutputAsync(100, {
			type: "image",
			imageUrl: "foo.png",
			accessibleLabel: "My image",
		});
	});
});
