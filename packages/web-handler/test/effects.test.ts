import { app, RenderEffect, UI, View } from "@talla-ui/core";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import * as removeAnimation from "../dist/removeAnimation.js";
import { renderView, setupWebContext, waitForRender } from "./helpers.js";

const { awaitRemoval, isMarkedForRemoval, markAnimateRemove } =
	removeAnimation as any;

/** Tracker for test effect lifecycle calls */
interface EffectTracker {
	elementCreatedCalls: Array<{ view: View; element: HTMLElement }>;
	renderedCalls: Array<{ view: View; element: HTMLElement }>;
	unlinkedCalls: Array<{ view: View; element: HTMLElement }>;
	reset(): void;
}

/** Creates a test effect that tracks all lifecycle method calls */
function createTestEffect(): {
	effect: RenderEffect<HTMLElement>;
	tracker: EffectTracker;
} {
	const tracker: EffectTracker = {
		elementCreatedCalls: [],
		renderedCalls: [],
		unlinkedCalls: [],
		reset() {
			this.elementCreatedCalls = [];
			this.renderedCalls = [];
			this.unlinkedCalls = [];
		},
	};

	const effect: RenderEffect<HTMLElement> = {
		onElementCreated(view, output) {
			tracker.elementCreatedCalls.push({ view, element: output.element });
		},
		onRendered(view, output) {
			tracker.renderedCalls.push({ view, element: output.element });
		},
		onUnlinked(view, output) {
			tracker.unlinkedCalls.push({ view, element: output.element });
		},
	};

	return { effect, tracker };
}

describe("Effects", () => {
	beforeEach(() => setupWebContext());
	afterEach(() => {
		RenderEffect.clear();
		app.clear();
	});

	describe("Symmetric effects", () => {
		const symmetricEffects: Array<[string, string]> = [
			["fade", "fade-in"],
			["fade-bottom", "fade-bottom-in"],
			["scale", "scale-in"],
			["pop", "pop-in"],
		];

		test.each(symmetricEffects)(
			"%s applies %s class on render",
			async (effectName, className) => {
				const cell = UI.Cell(UI.Text("Content")).effect(effectName).build();
				await renderView(cell);

				const el = document.querySelector(`.WebHandler-fx-${className}`);
				expect(el).not.toBeNull();
			},
		);
	});

	describe("Enter-only effects", () => {
		const enterOnlyEffects: Array<[string, string]> = [
			["fade-in", "fade-in"],
			["scale-in", "scale-in"],
		];

		test.each(enterOnlyEffects)(
			"%s applies %s class on render",
			async (effectName, className) => {
				const cell = UI.Cell(UI.Text("Content")).effect(effectName).build();
				await renderView(cell);

				const el = document.querySelector(`.WebHandler-fx-${className}`);
				expect(el).not.toBeNull();
			},
		);
	});

	describe("Exit-only effects", () => {
		test("fade-out does not apply class on render", async () => {
			const cell = UI.Cell(UI.Text("Content")).effect("fade-out").build();
			await renderView(cell);

			// Exit-only effects don't add classes on enter
			const el = document.querySelector(".WebHandler-fx-fade-out");
			expect(el).toBeNull();
		});
	});

	describe("Multiple effects", () => {
		test("Can apply multiple effects to same element", async () => {
			const cell = UI.Cell(UI.Text("Content"))
				.effect("fade-in")
				.effect("scale-in")
				.build();
			await renderView(cell);

			// Both classes should be on the SAME element
			const fadeEl = document.querySelector(".WebHandler-fx-fade-in");
			const scaleEl = document.querySelector(".WebHandler-fx-scale-in");
			expect(fadeEl).not.toBeNull();
			expect(scaleEl).not.toBeNull();
			expect(fadeEl).toBe(scaleEl);
		});
	});

	describe("UIShowView effects", () => {
		test("Effect on content applies class when shown", async () => {
			const show = UI.Show(UI.Text("Visible").effect("fade")).when(true);
			await renderView(show.build());

			const el = document.querySelector(".WebHandler-fx-fade-in");
			expect(el).not.toBeNull();
		});

		test("Effect on content with hidden UIShowView does not render", async () => {
			const show = UI.Show(UI.Text("Hidden").effect("fade")).when(false);
			await renderView(show.build());

			const el = document.querySelector(".WebHandler-fx-fade-in");
			expect(el).toBeNull();
		});
	});

	describe("Exit animations", () => {
		test("Symmetric effect adds exit class when element is removed", async () => {
			// Use UIShowView to control visibility
			const show = UI.Show(UI.Cell(UI.Text("Content")).effect("fade")).build();
			show.when = true;
			await renderView(show);

			const el = document.querySelector(
				".WebHandler-fx-fade-in",
			) as HTMLElement;
			expect(el).not.toBeNull();

			// Hide content - triggers exit animation
			show.when = false;
			await waitForRender();

			// Element should still be in DOM with exit class (animation pending)
			expect(el.classList.contains("WebHandler-fx-fade-out")).toBe(true);
			expect(el.classList.contains("WebHandler-fx--exiting")).toBe(true);
		});

		test("Exit-only effect adds exit class when element is removed", async () => {
			const show = UI.Show(
				UI.Cell(UI.Text("Content")).name("exit-test").effect("fade-out"),
			).build();
			show.when = true;
			await renderView(show);

			// Find the cell by its accessible name
			const el = document.querySelector(
				'[data-name="exit-test"]',
			) as HTMLElement;
			expect(el).not.toBeNull();

			// Hide content - triggers exit animation
			show.when = false;
			await waitForRender();

			// Exit-only effect should now add its class
			expect(el.classList.contains("WebHandler-fx-fade-out")).toBe(true);
			expect(el.classList.contains("WebHandler-fx--exiting")).toBe(true);
		});

		test("Enter-only effect removes element immediately (no exit animation)", async () => {
			const show = UI.Show(
				UI.Cell(UI.Text("Content")).effect("fade-in"),
			).build();
			show.when = true;
			await renderView(show);

			const el = document.querySelector(
				".WebHandler-fx-fade-in",
			) as HTMLElement;
			expect(el).not.toBeNull();

			// Hide content
			show.when = false;
			await waitForRender();

			// Enter-only effect has no exit animation, so element should be removed immediately
			// (not kept in DOM for animation like symmetric/exit-only effects)
			expect(document.contains(el)).toBe(false);
		});
	});

	describe("CSS exiting class", () => {
		test("Exiting class disables pointer events", async () => {
			const cell = UI.Cell(UI.Text("Content")).effect("fade").build();
			await renderView(cell);

			const el = document.querySelector(
				".WebHandler-fx-fade-in",
			) as HTMLElement;
			expect(el).not.toBeNull();

			// Manually add exiting class to test CSS
			el.classList.add("WebHandler-fx--exiting");
			await waitForRender();

			const styles = window.getComputedStyle(el);
			expect(styles.pointerEvents).toBe("none");
		});
	});

	describe("Effect lifecycle callbacks", () => {
		test("onElementCreated is called before element is in DOM", async () => {
			const { effect, tracker } = createTestEffect();
			RenderEffect.register("_test", effect);

			const cell = UI.Cell(UI.Text("Content")).effect("_test").build();
			await renderView(cell);

			expect(tracker.elementCreatedCalls).toHaveLength(1);
			expect(tracker.elementCreatedCalls[0]!.view).toBe(cell);
		});

		test("onRendered is called after element is in DOM", async () => {
			const { effect, tracker } = createTestEffect();
			RenderEffect.register("_test", effect);

			const cell = UI.Cell(UI.Text("Content")).effect("_test").build();
			await renderView(cell);

			expect(tracker.renderedCalls).toHaveLength(1);
			expect(tracker.renderedCalls[0]!.view).toBe(cell);
			// Element should be in DOM when onRendered is called
			expect(document.contains(tracker.renderedCalls[0]!.element)).toBe(true);
		});

		// Note: Both UIShowView and container content removal trigger onUnlinked
		// because ObservableList unlinks items when they are removed.

		test("onUnlinked is called when UIShowView hides content", async () => {
			const { effect, tracker } = createTestEffect();
			RenderEffect.register("_test", effect);

			const show = UI.Show(UI.Cell(UI.Text("Content")).effect("_test")).build();
			show.when = true;
			await renderView(show);

			expect(tracker.elementCreatedCalls).toHaveLength(1);
			expect(tracker.renderedCalls).toHaveLength(1);
			expect(tracker.unlinkedCalls).toHaveLength(0);

			// Hide content - this unlinks the view
			show.when = false;
			await waitForRender();

			expect(tracker.unlinkedCalls).toHaveLength(1);
		});

		test("Same element receives same view in all callbacks", async () => {
			const { effect, tracker } = createTestEffect();
			RenderEffect.register("_test", effect);

			const show = UI.Show(UI.Cell(UI.Text("Content")).effect("_test")).build();
			show.when = true;
			await renderView(show);

			const addingCall = tracker.elementCreatedCalls[0]!;
			const renderedCall = tracker.renderedCalls[0]!;

			// Same view and element in both calls
			expect(addingCall.view).toBe(renderedCall.view);
			expect(addingCall.element).toBe(renderedCall.element);

			// Hide to trigger unlinked
			show.when = false;
			await waitForRender();

			const unlinkedCall = tracker.unlinkedCalls[0]!;
			expect(unlinkedCall.view).toBe(addingCall.view);
			expect(unlinkedCall.element).toBe(addingCall.element);
		});
	});

	describe("markAnimateRemove mechanism", () => {
		test("isMarkedForRemoval returns true after markAnimateRemove", async () => {
			const cell = UI.Cell(UI.Text("Content")).name("test-cell").build();
			await renderView(cell);

			const el = document.querySelector(
				'[data-name="test-cell"]',
			) as HTMLElement;
			expect(el).not.toBeNull();

			// Not marked initially
			expect(isMarkedForRemoval(el)).toBe(false);

			// Mark it
			markAnimateRemove(el);
			expect(isMarkedForRemoval(el)).toBe(true);
		});

		test("Element stays in DOM when marked for removal (via onUnlinked)", async () => {
			// Use symmetric effect which calls markAnimateRemove in onUnlinked
			const show = UI.Show(
				UI.Cell(UI.Text("Content")).name("fade-cell").effect("fade"),
			).build();
			show.when = true;
			await renderView(show);

			const el = document.querySelector(
				'[data-name="fade-cell"]',
			) as HTMLElement;
			expect(el).not.toBeNull();
			expect(el.classList.contains("WebHandler-fx-fade-in")).toBe(true);
			expect(document.contains(el)).toBe(true);

			// Hide - triggers onUnlinked which calls markAnimateRemove
			show.when = false;
			await waitForRender();

			// Element should still be in DOM (marked for animated removal)
			expect(document.contains(el)).toBe(true);
			expect(isMarkedForRemoval(el)).toBe(true);
			expect(el.classList.contains("WebHandler-fx-fade-out")).toBe(true);
		});

		test("Element is removed after animationend event", async () => {
			const show = UI.Show(
				UI.Cell(UI.Text("Content")).name("anim-cell").effect("fade"),
			).build();
			show.when = true;
			await renderView(show);

			const el = document.querySelector(
				'[data-name="anim-cell"]',
			) as HTMLElement;
			expect(el).not.toBeNull();

			// Hide - triggers exit animation
			show.when = false;
			await waitForRender();

			// Element still in DOM, waiting for animation
			expect(document.contains(el)).toBe(true);

			// Simulate animationend event
			el.dispatchEvent(new Event("animationend"));

			// Allow promise to resolve
			await new Promise((r) => setTimeout(r, 0));

			// Element should now be removed
			expect(document.contains(el)).toBe(false);
		});

		test("Element is removed after transitionend event", async () => {
			const show = UI.Show(
				UI.Cell(UI.Text("Content")).name("trans-cell").effect("fade"),
			).build();
			show.when = true;
			await renderView(show);

			const el = document.querySelector(
				'[data-name="trans-cell"]',
			) as HTMLElement;
			expect(el).not.toBeNull();

			show.when = false;
			await waitForRender();

			expect(document.contains(el)).toBe(true);

			// transitionend also triggers removal
			el.dispatchEvent(new Event("transitionend"));
			await new Promise((r) => setTimeout(r, 0));

			expect(document.contains(el)).toBe(false);
		});

		test("awaitRemoval resolves immediately for unmarked elements", async () => {
			const cell = UI.Cell(UI.Text("Content")).name("unmarked").build();
			await renderView(cell);

			const el = document.querySelector(
				'[data-name="unmarked"]',
			) as HTMLElement;
			expect(el).not.toBeNull();
			expect(isMarkedForRemoval(el)).toBe(false);

			// Should resolve immediately
			let resolved = false;
			awaitRemoval(el).then(() => {
				resolved = true;
			});
			await Promise.resolve();
			expect(resolved).toBe(true);
		});

		test("awaitRemoval resolves after animation completes", async () => {
			const show = UI.Show(
				UI.Cell(UI.Text("Content")).name("await-cell").effect("fade"),
			).build();
			show.when = true;
			await renderView(show);

			const el = document.querySelector(
				'[data-name="await-cell"]',
			) as HTMLElement;
			expect(el).not.toBeNull();

			// Hide - triggers markAnimateRemove
			show.when = false;
			await waitForRender();

			expect(isMarkedForRemoval(el)).toBe(true);

			// awaitRemoval should not resolve yet
			let resolved = false;
			awaitRemoval(el).then(() => {
				resolved = true;
			});
			await Promise.resolve();
			expect(resolved).toBe(false);

			// Trigger animation end
			el.dispatchEvent(new Event("animationend"));
			await new Promise((r) => setTimeout(r, 0));

			expect(resolved).toBe(true);
		});

		test("Mount container persists during exit animation then cleans up", async () => {
			const show = UI.Show(
				UI.Cell(UI.Text("Content")).name("mount-test").effect("fade"),
			).build();
			show.when = true;
			await renderView(show);

			const el = document.querySelector(
				'[data-name="mount-test"]',
			) as HTMLElement;
			const mount = document.querySelector("web-handler-page-root");
			expect(el).not.toBeNull();
			expect(mount).not.toBeNull();

			// Hide - triggers exit animation
			show.when = false;
			await waitForRender();

			// Element should still be in DOM (animating)
			expect(document.contains(el)).toBe(true);
			// Mount should still exist
			expect(document.contains(mount)).toBe(true);

			// Complete animation
			el.dispatchEvent(new Event("animationend"));
			await new Promise((r) => setTimeout(r, 0));

			// Element should be removed
			expect(document.contains(el)).toBe(false);

			// Wait for mount cleanup (has 20ms delay)
			await new Promise((r) => setTimeout(r, 50));
			expect(document.contains(mount)).toBe(false);
		});
	});

	describe("Container content removal", () => {
		test("Element with effect stays in DOM when removed from container", async () => {
			// Create a column with content that can be removed
			const column = UI.Column(
				UI.Cell(UI.Text("Item 1")).name("item1").effect("fade"),
				UI.Cell(UI.Text("Item 2")).name("item2"),
			).build();
			await renderView(column);

			const item1 = document.querySelector(
				'[data-name="item1"]',
			) as HTMLElement;
			const item2 = document.querySelector(
				'[data-name="item2"]',
			) as HTMLElement;
			expect(item1).not.toBeNull();
			expect(item2).not.toBeNull();

			// Remove item1 from the column's content
			column.content.remove(column.content.first()!);
			await waitForRender();

			// item1 should still be in DOM (marked for animated removal)
			expect(document.contains(item1)).toBe(true);
			expect(isMarkedForRemoval(item1)).toBe(true);
			expect(item1.classList.contains("WebHandler-fx-fade-out")).toBe(true);

			// item2 should still be there
			expect(document.contains(item2)).toBe(true);

			// Complete animation
			item1.dispatchEvent(new Event("animationend"));
			await new Promise((r) => setTimeout(r, 0));

			// Now item1 should be removed
			expect(document.contains(item1)).toBe(false);
			expect(document.contains(item2)).toBe(true);
		});

		test("Element without exit effect is removed immediately from container", async () => {
			const column = UI.Column(
				UI.Cell(UI.Text("Item 1")).name("item1").effect("fade-in"), // Enter-only
				UI.Cell(UI.Text("Item 2")).name("item2"),
			).build();
			await renderView(column);

			const item1 = document.querySelector(
				'[data-name="item1"]',
			) as HTMLElement;
			expect(item1).not.toBeNull();

			// Remove item1
			column.content.remove(column.content.first()!);
			await waitForRender();

			// Enter-only effect has no exit animation, element removed immediately
			expect(document.contains(item1)).toBe(false);
		});

		test("onUnlinked callback is invoked when removing from container", async () => {
			const { effect, tracker } = createTestEffect();
			RenderEffect.register("_test", effect);

			const column = UI.Column(
				UI.Cell(UI.Text("Item")).effect("_test"),
			).build();
			await renderView(column);

			expect(tracker.elementCreatedCalls).toHaveLength(1);
			expect(tracker.renderedCalls).toHaveLength(1);
			expect(tracker.unlinkedCalls).toHaveLength(0);

			// Remove the item from the column - view gets unlinked
			column.content.remove(column.content.first()!);
			await waitForRender();

			expect(tracker.unlinkedCalls).toHaveLength(1);
		});
	});

	describe("Error handling", () => {
		test("Unregistered effect logs error but renders view", async () => {
			// Using an effect name that is definitely not registered
			// The error is logged via safeCall but doesn't prevent rendering
			const cell = UI.Cell(UI.Text("Content"))
				.name("error-test")
				.effect("_nonexistent_effect_")
				.build();

			// Should not throw - error is caught and logged
			await renderView(cell);

			// Element should still render despite the effect error
			const el = document.querySelector('[data-name="error-test"]');
			expect(el).not.toBeNull();
		});
	});

	describe("MessageDialog drag effect", () => {
		test("should NOT have drag effect when useDragEffects not called", async () => {
			// Set up fresh context without drag effects
			document.body.innerHTML = "";
			document.head.innerHTML = "";
			app.clear();
			RenderEffect.clear();

			// Import useWebContext and useAnimationEffects only (not useDragEffects)
			const { useWebContext, useAnimationEffects } = await import(
				"../dist/index.js"
			);
			useWebContext();
			useAnimationEffects(); // Register animation effects but NOT drag effects

			// Check that the drag-modal effect is NOT registered
			expect(RenderEffect.has("drag-modal")).toBe(false);
		});

		test("should have drag effect when useDragEffects is called", async () => {
			// Set up fresh context with all effects including drag
			document.body.innerHTML = "";
			document.head.innerHTML = "";
			app.clear();
			RenderEffect.clear();

			const { useWebContext, useAnimationEffects, useDragEffects } =
				await import("../dist/index.js");
			useWebContext();
			useAnimationEffects();
			useDragEffects(); // Enable drag effects

			// Check that the drag-modal effect is registered
			expect(RenderEffect.has("drag-modal")).toBe(true);
		});
	});
});
