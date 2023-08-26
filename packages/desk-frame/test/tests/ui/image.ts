import { app, UIImage } from "../../../dist/index.js";
import { describe, expect, test, useTestContext } from "@desk-framework/test";

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

	test("Preset using withUrl", () => {
		let MyImage = UIImage.withUrl("foo.png");
		let image = new MyImage();
		expect(image).toHaveProperty("url").asString().toBe("foo.png");
	});

	test("Preset with properties", () => {
		let MyImage = UIImage.with({ url: "foo.png" });
		let image = new MyImage();
		expect(image).toHaveProperty("url").asString().toBe("foo.png");
	});

	test("Focusable follows keyboard focusable", () => {
		let plainImage = new UIImage();
		expect(plainImage.allowFocus).toBeFalsy();
		expect(plainImage.allowKeyboardFocus).toBeFalsy();
		let focusableImage = new (UIImage.with({ allowKeyboardFocus: true }))();
		expect(focusableImage.allowFocus).toBeTruthy();
		expect(focusableImage.allowKeyboardFocus).toBeTruthy();
	});

	test("Rendered with image url", async (t) => {
		let MyImage = UIImage.with({
			url: "foo.png",
			accessibleLabel: "My image",
		});
		let image = new MyImage();
		app.render(image);
		await t.expectOutputAsync(100, {
			type: "image",
			imageUrl: "foo.png",
			accessibleLabel: "My image",
		});
	});
});
