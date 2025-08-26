import { useTestContext } from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import {
	UI,
	UIAnimation,
	UIColor,
	UIIconResource,
	UIStyle,
} from "../../dist/index.js";

beforeEach(() => {
	useTestContext(); // reset all theme values
});

test("ThemeResolver creates references for predefined keys", () => {
	// Create a simple theme resolver
	let resolver = new UIStyle.ThemeResolver(
		["primary", "secondary"],
		(f) => new UIColor(f()?.toString() || "#000"),
	);

	// Test that refs() creates objects for all keys
	let refs = resolver.refs();
	expect(refs).toHaveProperty("primary");
	expect(refs).toHaveProperty("secondary");
	expect(refs.primary).toBeInstanceOf(UIColor);
	expect(refs.secondary).toBeInstanceOf(UIColor);
});

test("ThemeResolver.set() updates theme values", () => {
	// Test using the actual UIColor.theme to demonstrate dynamic updates
	let testRef = UIColor.theme.ref("primary");

	// Set initial value
	UIColor.theme.set({ primary: new UIColor("#ff0000") });
	expect(testRef.toString()).toBe("#ff0000");

	// Update the value - the same reference should resolve to the new value
	UIColor.theme.set({ primary: new UIColor("#00ff00") });
	expect(testRef.toString()).toBe("#00ff00");
});

test("ThemeResolver.set() can add new keys", () => {
	let resolver = new UIStyle.ThemeResolver(
		["existing"],
		(f: () => UIColor | undefined) => new UIColor(f()?.toString() || "#000"),
	);

	// Add a new key
	let updatedResolver = resolver.set({ newKey: new UIColor("#blue") });
	let refs = updatedResolver.refs();

	expect(refs).toHaveProperty("existing");
	expect(refs).toHaveProperty("newKey");
	expect(refs.newKey.toString()).toBe("#blue");
});

test("ThemeResolver invalidation callback is called", () => {
	let invalidateCalled = false;
	let resolver = new UIStyle.ThemeResolver(
		["test"],
		(f) => new UIColor(f()?.toString() || "#000"),
		() => {
			invalidateCalled = true;
		},
	);

	resolver.set({ test: new UIColor("#red") });
	expect(invalidateCalled).toBe(true);
});

test("UIColor theme has predefined color keys", () => {
	expect(UI.colors).toHaveProperty("black");
	expect(UI.colors).toHaveProperty("white");
	expect(UI.colors).toHaveProperty("red");
	expect(UI.colors).toHaveProperty("blue");
	expect(UI.colors).toHaveProperty("transparent");
});

test("UIColor theme references resolve dynamically", () => {
	let redRef = UIColor.theme.ref("red");
	UIColor.theme.set({ red: new UIColor("#ff0000") });
	expect(redRef.toString()).toBe("#ff0000");
	UIColor.theme.set({ red: new UIColor("#cc0000") });
	expect(redRef.toString()).toBe("#cc0000");
});

test("UIColor theme references support color methods", () => {
	UIColor.theme.set({ primary: new UIColor("#003388") });
	let primaryRef = UIColor.theme.ref("primary");
	let alphaColor = primaryRef.alpha(0.5);
	expect(alphaColor.toString()).toContain("0.5");
	let brighterColor = primaryRef.brighten(0.2);
	expect(brighterColor.toString()).not.toBe(primaryRef.toString());
	let textColor = primaryRef.text();
	expect(String(textColor)).toBe(UI.colors.lightText.toString());
});

test("UIIconResource theme has predefined icon keys", () => {
	expect(UI.icons).toHaveProperty("blank");
	expect(UI.icons).toHaveProperty("close");
	expect(UI.icons).toHaveProperty("check");
	expect(UI.icons).toHaveProperty("chevronDown");
	expect(UI.icons).toHaveProperty("plus");
	expect(UI.icons).toHaveProperty("menu");
});

test("UIIconResource theme references resolve dynamically", () => {
	let checkRef = UIIconResource.theme.ref("check");
	let checkIcon = new UIIconResource("<svg>check</svg>");
	UIIconResource.theme.set({ check: checkIcon });
	expect(checkRef.toString()).toBe("<svg>check</svg>");
	let newCheckIcon = new UIIconResource("<svg>✓</svg>");
	UIIconResource.theme.set({ check: newCheckIcon });
	expect(checkRef.toString()).toBe("<svg>✓</svg>");
});

test("UIIconResource theme references support icon methods", () => {
	let arrowIcon = new UIIconResource("<svg>→</svg>").setMirrorRTL(true);
	let t = UIIconResource.theme.set({ arrow: arrowIcon });
	let arrowRef = t.ref("arrow");
	expect(arrowRef.toString()).toBe("<svg>→</svg>");
	expect(arrowRef.isMirrorRTL()).toBe(true);
});

test("UIAnimation theme has predefined animation keys", () => {
	expect(UI.animations).toHaveProperty("fadeIn");
	expect(UI.animations).toHaveProperty("fadeOut");
	expect(UI.animations).toHaveProperty("fadeInUp");
	expect(UI.animations).toHaveProperty("showDialog");
	expect(UI.animations).toHaveProperty("hideMenu");
});

test("UIAnimation theme references resolve dynamically", async () => {
	let testAnimation = new UIAnimation(async () => {
		return "test-animation-applied";
	});
	UIAnimation.theme.set({ fadeIn: testAnimation });
	let fadeInRef = UIAnimation.theme.ref("fadeIn");
	expect(fadeInRef).toBeInstanceOf(UIAnimation);
	expect(await fadeInRef.applyTransform(0 as any)).toBe(
		"test-animation-applied",
	);
});

test("UIStyle theme has element style resolvers", () => {
	expect(UI.styles.label).toBeDefined();
	expect(UI.styles.button).toBeDefined();
	expect(UI.styles.textfield).toBeDefined();
	expect(UI.styles.toggle).toBeDefined();
	expect(UI.styles.image).toBeDefined();
	expect(UI.styles.divider).toBeDefined();
});

test("UIStyle theme resolvers have expected keys", () => {
	expect(UI.styles.button).toHaveProperty("default");
	expect(UI.styles.button).toHaveProperty("primary");
	expect(UI.styles.button).toHaveProperty("success");
	expect(UI.styles.button).toHaveProperty("danger");

	expect(UI.styles.label).toHaveProperty("default");
	expect(UI.styles.label).toHaveProperty("title");
	expect(UI.styles.label).toHaveProperty("bold");
	expect(UI.styles.label).toHaveProperty("secondary");
});

test("UIStyle theme references resolve dynamically", () => {
	let testStyle = new UIStyle({ background: "#ff0000", padding: 10 });
	let t = UIStyle.theme.button.set({ test: testStyle });
	let testRef = t.ref("test");
	expect(testRef).toBeInstanceOf(UIStyle);
	expect(testRef.getStyles()).toEqual([{ background: "#ff0000", padding: 10 }]);
});

test("UIStyle theme references support style methods", () => {
	let baseStyle = new UIStyle({ padding: 8, background: "#f0f0f0" });
	let t = UIStyle.theme.button.set({ base: baseStyle });
	let baseRef = t.ref("base");
	let extendedStyle = baseRef.extend({ margin: 4 });
	expect(extendedStyle).toBeInstanceOf(UIStyle);
	expect(extendedStyle.getStyles()).toEqual([
		{ padding: 8, background: "#f0f0f0" },
		{ margin: 4 },
	]);

	let overriddenStyle = baseRef.override({ padding: 16 });
	expect(overriddenStyle).toBeInstanceOf(UIStyle);
	expect(overriddenStyle.getOverrides()).toEqual({ padding: 16 });
});

test("Undefined theme values resolve gracefully", () => {
	let resolver = new UIStyle.ThemeResolver(
		["undefined"],
		(f: () => UIColor | undefined) =>
			new UIColor(f()?.toString() || "#fallback"),
	);
	let ref = resolver.ref("undefined");
	expect(ref.toString()).toBe("#fallback");
});
