import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import { UI, UIImage, UIIconResource } from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

test("Constructor with source", () => {
	let image = new UIImage("foo.png");
	expect(image).toHaveProperty("source", "foo.png");
});

test("View builder with properties", () => {
	let myImage = UI.Image("foo.png");
	let image = myImage.create();
	expect(image).toHaveProperty("source", "foo.png");
});

test("Focusable follows keyboard focusable", () => {
	let plainImage = new UIImage();
	expect(plainImage.allowFocus).toBeFalsy();
	expect(plainImage.allowKeyboardFocus).toBeFalsy();
	let focusableImage = UI.Image().allowKeyboardFocus().create();
	expect(focusableImage.allowFocus).toBeTruthy();
	expect(focusableImage.allowKeyboardFocus).toBeTruthy();
});

test("Rendered with image source", async () => {
	let myImage = UI.Image("foo.png").accessibleLabel("My image");
	let image = myImage.create();
	renderTestView(image);
	await expectOutputAsync({
		type: "image",
		imageUrl: "foo.png",
		accessibleLabel: "My image",
	});
});

test("Constructor with UIIconResource", () => {
	let icon = new UIIconResource("<svg>test</svg>");
	let image = new UIImage(icon);
	expect(image.source).toBe(icon);
	expect(image.source instanceof UIIconResource).toBe(true);
});

test("View builder with custom icon", async () => {
	let customIcon = new UIIconResource("<svg>custom icon</svg>");
	let myImage = UI.Image(customIcon).accessibleLabel("Custom icon");
	let image = myImage.create();
	renderTestView(image);
	await expectOutputAsync({
		type: "image",
		icon: "<svg>custom icon</svg>",
		accessibleLabel: "Custom icon",
	});
});

test("View builder with theme icon", async () => {
	let myImage = UI.Image(UI.icons.check).accessibleLabel("Check icon");
	let image = myImage.create();
	renderTestView(image);
	await expectOutputAsync({
		type: "image",
		accessibleLabel: "Check icon",
	});
});

test("Image load event with URL source", async () => {
	let loadFired = false;
	let myImage = UI.Image("test.png");
	let image = myImage.create();
	image.listen((e) => {
		if (e.name === "Load") loadFired = true;
	});
	renderTestView(image);

	// Wait for the simulated load event (renderer waits 10ms)
	await new Promise((resolve) => setTimeout(resolve, 20));
	expect(loadFired).toBe(true);
});

test("Image load event with icon source", async () => {
	let loadFired = false;
	let customIcon = new UIIconResource("<svg>icon</svg>");
	let myImage = UI.Image(customIcon);
	let image = myImage.create();
	image.listen((e) => {
		if (e.name === "Load") loadFired = true;
	});
	renderTestView(image);

	// Wait for the simulated load event (renderer waits 10ms)
	await new Promise((resolve) => setTimeout(resolve, 20));
	expect(loadFired).toBe(true);
});
