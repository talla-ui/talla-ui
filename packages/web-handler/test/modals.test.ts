import { app, ModalMenuOptions, UI } from "@talla-ui/core";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
	renderView,
	setupWebContext,
	simulateClick,
	waitForRender,
} from "./helpers.js";

/** Wait for an element to appear in the DOM with timeout */
async function waitForSelector(
	selector: string,
	timeout = 500,
): Promise<HTMLElement | null> {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		await waitForRender();
		const el = document.querySelector(selector) as HTMLElement;
		if (el) return el;
		await new Promise((r) => setTimeout(r, 1));
	}
	return null;
}

describe("Modal dialogs", () => {
	beforeEach(() =>
		setupWebContext((opts) => {
			// Disable animations to avoid timer issues in tests
			opts.reducedMotion = true;
		}),
	);
	afterEach(() => {
		app.clear();
		return waitForRender();
	});

	test("Alert dialog renders with message text", async () => {
		const dialogPromise = app.showAlertDialogAsync("Test alert message");

		const alertDialog = await waitForSelector("[role='alertdialog']");
		expect(alertDialog).not.toBeNull();
		expect(alertDialog?.textContent).toContain("Test alert message");

		simulateClick(alertDialog?.querySelector("button"));
		await dialogPromise;
	}, 2000);

	test("Confirm dialog returns true when confirmed", async () => {
		const dialogPromise = app.showConfirmDialogAsync(
			"Confirm?",
			"OK",
			"Cancel",
		);

		const alertDialog = await waitForSelector("[role='alertdialog']");
		const buttons = alertDialog?.querySelectorAll("button");
		simulateClick(
			Array.from(buttons || []).find((b) => b.textContent?.includes("OK")),
		);

		const result = await dialogPromise;
		expect(result).toBe(true);
	}, 2000);

	test("Confirm dialog returns false when cancelled", async () => {
		const dialogPromise = app.showConfirmDialogAsync(
			"Confirm?",
			"OK",
			"Cancel",
		);

		const alertDialog = await waitForSelector("[role='alertdialog']");
		const buttons = alertDialog?.querySelectorAll("button");
		simulateClick(
			Array.from(buttons || []).find((b) => b.textContent?.includes("Cancel")),
		);

		const result = await dialogPromise;
		expect(result).toBe(false);
	}, 2000);

	test("Modal menu renders with items", async () => {
		const button = UI.Button("Open Menu").build();
		await renderView(button);

		const menuPromise = app.showModalMenuAsync(
			new ModalMenuOptions([
				{ value: "one", text: "Item One" },
				{ value: "two", text: "Item Two" },
			]),
			button,
		);

		const menu = await waitForSelector("[role='menu']");
		expect(menu).not.toBeNull();
		expect(menu?.textContent).toContain("Item One");
		expect(menu?.textContent).toContain("Item Two");

		menu?.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
		);
		const result = await menuPromise;
		expect(result).toBeUndefined();
	}, 2000);
});
