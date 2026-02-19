import { app, UI } from "@talla-ui/core";
import { afterEach, describe, expect, test } from "vitest";
import { setWebTheme, WebTheme } from "../dist/index.js";
import { setupWebContext, waitForRender } from "./helpers.js";

describe("useWebContext", () => {
	afterEach(() => {
		app.clear();
	});

	test("Initializes app.renderer", () => {
		setupWebContext();
		expect(app.renderer).toBeDefined();
	});

	test("Initializes app.viewport", () => {
		setupWebContext();
		expect(app.viewport).toBeDefined();
	});

	test("Initializes app.navigation", () => {
		setupWebContext();
		expect(app.navigation).toBeDefined();
	});

	test("Sets default colors", () => {
		setupWebContext();
		expect(UI.colors.text).toBeDefined();
		expect(UI.colors.background).toBeDefined();
		expect(UI.colors.accent).toBeDefined();
	});

	test("Applies custom accent color via setWebTheme", () => {
		setupWebContext(() => {
			setWebTheme(new WebTheme().colors({ accent: "#ff0000" }));
		});
		// The accent color should be red
		let out = UI.colors.accent.output();
		expect(out.rgb()[0]).toBe(255);
		expect(out.rgb()[1]).toBe(0);
		expect(out.rgb()[2]).toBe(0);
	});

	test("Creates CSS stylesheets", async () => {
		setupWebContext();
		await waitForRender();
		// Should have either adoptedStyleSheets or style elements
		const hasStyles =
			document.adoptedStyleSheets?.length > 0 ||
			document.querySelectorAll("style").length > 0;
		expect(hasStyles).toBe(true);
	});

	test("Clears previous context on re-initialization", async () => {
		setupWebContext();
		const renderer1 = app.renderer;
		setupWebContext();
		expect(app.renderer).not.toBe(renderer1);
	});
});
