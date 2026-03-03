import { app, UI, UIIconResource } from "@talla-ui/core";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { renderView, setupWebContext, waitForRender } from "../helpers.js";

describe("UIImageRenderer", () => {
	beforeEach(() => setupWebContext());
	afterEach(() => app.clear());

	describe("Basic rendering", () => {
		test("Renders figure with img child", async () => {
			const image = UI.Image("https://example.com/image.png").build();
			await renderView(image);

			const figure = document.querySelector("figure");
			expect(figure).not.toBeNull();
			expect(figure?.querySelector("img")).not.toBeNull();
		});

		test("Empty source renders figure with empty img", async () => {
			const image = UI.Image().build();
			await renderView(image);

			const figure = document.querySelector("figure");
			expect(figure).not.toBeNull();
			expect(figure?.querySelector("img")?.getAttribute("src")).toBe("");
		});
	});

	describe("Image source", () => {
		test("URL source sets img.src", async () => {
			const url = "https://example.com/test.png";
			const image = UI.Image(url).build();
			await renderView(image);

			expect(
				(document.querySelector("figure img") as HTMLImageElement).src,
			).toBe(url);
		});

		test("Data URL source sets correctly", async () => {
			const dataUrl = "data:image/png;base64,ABC123";
			const image = UI.Image(dataUrl).build();
			await renderView(image);

			expect(
				(document.querySelector("figure img") as HTMLImageElement).src,
			).toBe(dataUrl);
		});
	});

	describe("UIIconResource", () => {
		test("Renders icon element with SVG content", async () => {
			const icon = new UIIconResource(
				'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>',
			);
			const image = UI.Image(icon).build();
			await renderView(image);

			const figure = document.querySelector("figure");
			expect(figure?.querySelector("icon")).not.toBeNull();
			expect(figure?.querySelector("img")).toBeNull();
			expect(figure?.querySelector("icon svg")).not.toBeNull();
		});

		test("Text icon content renders", async () => {
			const icon = new UIIconResource("X");
			const image = UI.Image(icon).build();
			await renderView(image);

			expect(document.querySelector("figure icon")?.textContent).toContain("X");
		});

		test("Icon emits Load event", async () => {
			const icon = new UIIconResource('<svg viewBox="0 0 24 24"></svg>');
			let loadFired = false;
			const image = UI.Image(icon)
				.onLoad(() => {
					loadFired = true;
				})
				.build();

			await renderView(image);
			expect(loadFired).toBe(true);
		});
	});

	describe("Focus", () => {
		test("allowKeyboardFocus sets tabIndex=0", async () => {
			const image = UI.Image("https://example.com/image.png")
				.allowKeyboardFocus()
				.build();
			await renderView(image);

			expect((document.querySelector("figure") as HTMLElement).tabIndex).toBe(
				0,
			);
		});

		test("allowFocus sets tabIndex=-1", async () => {
			const image = UI.Image("https://example.com/image.png")
				.allowFocus()
				.build();
			await renderView(image);

			expect((document.querySelector("figure") as HTMLElement).tabIndex).toBe(
				-1,
			);
		});

		test("Default has no tabIndex attribute", async () => {
			const image = UI.Image("https://example.com/image.png").build();
			await renderView(image);

			expect(document.querySelector("figure")?.hasAttribute("tabindex")).toBe(
				false,
			);
		});
	});

	describe("Source updates", () => {
		test("Changing URL source updates image", async () => {
			const image = UI.Image("https://example.com/first.png").build();
			await renderView(image);

			expect(
				(document.querySelector("figure img") as HTMLImageElement).src,
			).toBe("https://example.com/first.png");

			image.source = "https://example.com/second.png";
			await waitForRender();

			expect(
				(document.querySelector("figure img") as HTMLImageElement).src,
			).toBe("https://example.com/second.png");
		});

		test("Changing between URL and icon swaps elements", async () => {
			const image = UI.Image("https://example.com/image.png").build();
			await renderView(image);

			expect(document.querySelector("figure img")).not.toBeNull();
			expect(document.querySelector("figure icon")).toBeNull();

			image.source = new UIIconResource('<svg viewBox="0 0 24 24"></svg>');
			await waitForRender();

			expect(document.querySelector("figure img")).toBeNull();
			expect(document.querySelector("figure icon")).not.toBeNull();

			image.source = "https://example.com/image.png";
			await waitForRender();

			expect(document.querySelector("figure img")).not.toBeNull();
			expect(document.querySelector("figure icon")).toBeNull();
		});
	});

	describe("Icon styling", () => {
		test("Icon uses default size", async () => {
			const icon = new UIIconResource('<svg viewBox="0 0 24 24"></svg>');
			const image = UI.Image(icon).build();
			await renderView(image);

			const figure = document.querySelector("figure") as HTMLElement;
			expect(figure.style.width).toBeTruthy();
			expect(figure.style.height).toBeTruthy();
		});

		test("Custom dimensions override defaults", async () => {
			const icon = new UIIconResource('<svg viewBox="0 0 24 24"></svg>');
			const image = UI.Image(icon).width(48).height(48).build();
			await renderView(image);

			const figure = document.querySelector("figure") as HTMLElement;
			expect(figure.style.width).toBe("3rem"); // 48/16
			expect(figure.style.height).toBe("3rem");
		});

		test("SVG uses currentColor for fill", async () => {
			const icon = new UIIconResource(
				'<svg viewBox="0 0 24 24"><circle/></svg>',
			);
			const image = UI.Image(icon).build();
			await renderView(image);

			const svg = document.querySelector("figure icon svg") as SVGElement;
			expect(svg.style.fill.toLowerCase()).toBe("currentcolor");
		});

		test("SVG with stroke uses currentColor for stroke", async () => {
			const icon = new UIIconResource(
				'<svg viewBox="0 0 24 24" stroke="#000"><circle/></svg>',
			);
			const image = UI.Image(icon).build();
			await renderView(image);

			const svg = document.querySelector("figure icon svg") as SVGElement;
			expect(svg.style.stroke.toLowerCase()).toBe("currentcolor");
		});
	});
});
