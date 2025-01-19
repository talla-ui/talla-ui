import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import { ui, UIImage } from "../../dist/index.js";

beforeEach(() => {
	useTestContext({ renderFrequency: 5 });
});

test("Constructor with URL", () => {
	let image = new UIImage("foo.png");
	expect(image).toHaveProperty("url", "foo.png");
});

test("View builder with properties", () => {
	let myImage = ui.image({ url: "foo.png" });
	let image = myImage.create();
	expect(image).toHaveProperty("url", "foo.png");
});

test("Focusable follows keyboard focusable", () => {
	let plainImage = new UIImage();
	expect(plainImage.allowFocus).toBeFalsy();
	expect(plainImage.allowKeyboardFocus).toBeFalsy();
	let focusableImage = ui.image({ allowKeyboardFocus: true }).create();
	expect(focusableImage.allowFocus).toBeTruthy();
	expect(focusableImage.allowKeyboardFocus).toBeTruthy();
});

test("Rendered with image url", async () => {
	let myImage = ui.image({
		url: "foo.png",
		accessibleLabel: "My image",
	});
	let image = myImage.create();
	renderTestView(image);
	await expectOutputAsync({
		type: "image",
		imageUrl: "foo.png",
		accessibleLabel: "My image",
	});
});
