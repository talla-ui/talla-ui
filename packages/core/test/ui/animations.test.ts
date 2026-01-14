import { useTestContext } from "@talla-ui/test-handler";
import { beforeEach, describe, expect, test } from "vitest";
import { UI, UIAnimation } from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

describe("Animation registration and lookup", () => {
	test("UIAnimation.defaults contains standard animation references", () => {
		expect(UIAnimation.defaults).toHaveProperty("fadeIn");
		expect(UIAnimation.defaults).toHaveProperty("fadeOut");
		expect(UIAnimation.defaults).toHaveProperty("fadeInUp");
		expect(UIAnimation.defaults).toHaveProperty("fadeInDown");
		expect(UIAnimation.defaults).toHaveProperty("showDialog");
		expect(UIAnimation.defaults).toHaveProperty("hideDialog");
		expect(Object.keys(UIAnimation.defaults).length).toBeGreaterThanOrEqual(14);
	});

	test("UIAnimation constructor creates animation with transform function", () => {
		let called = false;
		let anim = new UIAnimation(async () => {
			called = true;
		});
		expect(anim).toBeInstanceOf(UIAnimation);
		// Call applyTransform to verify function is stored
		anim.applyTransform({} as any);
		expect(called).toBe(true);
	});

	test("UIAnimation.setAnimations registers new animations", () => {
		let customAnim = new UIAnimation(async () => {});
		UIAnimation.setAnimations({
			customFade: customAnim,
		});
		let ref = UIAnimation.getAnimation("customFade");
		expect(ref).toBeInstanceOf(UIAnimation);
	});

	test("UIAnimation.setAnimations updates existing animations", async () => {
		let callCount = 0;
		let anim1 = new UIAnimation(async () => {
			callCount = 1;
		});
		let anim2 = new UIAnimation(async () => {
			callCount = 2;
		});

		UIAnimation.setAnimations({ updateableAnim: anim1 });
		let animRef = UIAnimation.getAnimation("updateableAnim");

		// Call the reference - should use anim1
		await animRef.applyTransform({} as any);
		expect(callCount).toBe(1);

		// Update the animation
		UIAnimation.setAnimations({ updateableAnim: anim2 });

		// Same reference should now use anim2
		await animRef.applyTransform({} as any);
		expect(callCount).toBe(2);
	});

	test("UIAnimation.getAnimation returns cached references", () => {
		let ref1 = UIAnimation.getAnimation("fadeIn");
		let ref2 = UIAnimation.getAnimation("fadeIn");
		expect(ref1).toBe(ref2);
	});

	test("UIAnimation.getAnimation returns animation for unknown names", () => {
		// Should return an animation instance even for unknown names
		let unknown = UIAnimation.getAnimation("unknownAnimName");
		expect(unknown).toBeInstanceOf(UIAnimation);
	});

	test("UI.animations has predefined animation keys", () => {
		expect(UI.animations).toHaveProperty("fadeIn");
		expect(UI.animations).toHaveProperty("fadeOut");
		expect(UI.animations).toHaveProperty("fadeInUp");
		expect(UI.animations).toHaveProperty("fadeInDown");
		expect(UI.animations).toHaveProperty("showDialog");
		expect(UI.animations).toHaveProperty("hideDialog");
	});

	test("UI.animation function returns animation references", () => {
		let customAnim = new UIAnimation(async () => {});
		UIAnimation.setAnimations({ myCustomAnim: customAnim });
		let anim = UI.animation("myCustomAnim");
		expect(anim).toBeInstanceOf(UIAnimation);
	});

	test("UI.animation returns same reference as UIAnimation.getAnimation", () => {
		let ref1 = UI.animation("fadeIn");
		let ref2 = UIAnimation.getAnimation("fadeIn");
		expect(ref1).toBe(ref2);
	});

	test("UIAnimation.resolve creates dynamic animation reference", async () => {
		let called = false;
		let baseAnim = new UIAnimation(async () => {
			called = true;
		});
		let resolved = UIAnimation.resolve(() => baseAnim);
		await resolved.applyTransform({} as any);
		expect(called).toBe(true);
	});

	test("UIAnimation.resolve does nothing when factory returns undefined", async () => {
		let resolved = UIAnimation.resolve(() => undefined);
		// Should not throw when called
		await resolved.applyTransform({} as any);
	});
});

describe("Animation transform delegation", () => {
	test("getAnimation reference delegates to registered animation", async () => {
		let transformReceived: any;
		let customAnim = new UIAnimation(async (t) => {
			transformReceived = t;
		});
		UIAnimation.setAnimations({ delegateTest: customAnim });

		let animRef = UIAnimation.getAnimation("delegateTest");
		let mockTransform = { test: "value" };
		await animRef.applyTransform(mockTransform as any);

		expect(transformReceived).toBe(mockTransform);
	});

	test("Animation returns promise from applyTransform", async () => {
		let anim = new UIAnimation(async () => {
			return "result";
		});
		let result = anim.applyTransform({} as any);
		expect(result).toBeInstanceOf(Promise);
		expect(await result).toBe("result");
	});
});
