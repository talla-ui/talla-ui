import { useTestContext } from "@talla-ui/test-handler";
import { beforeEach, describe, expect, test } from "vitest";
import { UI, UIIconResource } from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

describe("Icon registration and lookup", () => {
	test("UIIconResource.defaults contains standard icon references", () => {
		expect(UIIconResource.defaults).toHaveProperty("blank");
		expect(UIIconResource.defaults).toHaveProperty("close");
		expect(UIIconResource.defaults).toHaveProperty("check");
		expect(UIIconResource.defaults).toHaveProperty("chevronDown");
		expect(UIIconResource.defaults).toHaveProperty("plus");
		expect(UIIconResource.defaults).toHaveProperty("menu");
		expect(Object.keys(UIIconResource.defaults).length).toBeGreaterThanOrEqual(
			12,
		);
	});

	test("UIIconResource constructor creates icon with content", () => {
		let icon = new UIIconResource("<svg>test</svg>");
		expect(icon.toString()).toBe("<svg>test</svg>");
	});

	test("UIIconResource.setIcons registers new icons with strings", () => {
		UIIconResource.setIcons({
			customIcon1: "<svg>icon1</svg>",
			customIcon2: "<svg>icon2</svg>",
		});
		expect(UIIconResource.getIcon("customIcon1").toString()).toBe(
			"<svg>icon1</svg>",
		);
		expect(UIIconResource.getIcon("customIcon2").toString()).toBe(
			"<svg>icon2</svg>",
		);
	});

	test("UIIconResource.setIcons registers new icons with UIIconResource instances", () => {
		let iconInstance = new UIIconResource("<svg>instance</svg>");
		UIIconResource.setIcons({
			iconFromInstance: iconInstance,
		});
		expect(UIIconResource.getIcon("iconFromInstance").toString()).toBe(
			"<svg>instance</svg>",
		);
	});

	test("UIIconResource.setIcons updates existing icons", () => {
		UIIconResource.setIcons({ updateableIcon: "<svg>v1</svg>" });
		let iconRef = UIIconResource.getIcon("updateableIcon");
		expect(iconRef.toString()).toBe("<svg>v1</svg>");

		// Update the icon
		UIIconResource.setIcons({ updateableIcon: "<svg>v2</svg>" });
		// Same reference should now resolve to new value
		expect(iconRef.toString()).toBe("<svg>v2</svg>");
	});

	test("UIIconResource.getIcon returns cached references", () => {
		let ref1 = UIIconResource.getIcon("check");
		let ref2 = UIIconResource.getIcon("check");
		expect(ref1).toBe(ref2);
	});

	test("UIIconResource.getIcon returns empty string for unknown icons", () => {
		let unknown = UIIconResource.getIcon("unknownIconName");
		expect(unknown.toString()).toBe("");
	});

	test("UI.icons has predefined icon keys", () => {
		expect(UI.icons).toHaveProperty("blank");
		expect(UI.icons).toHaveProperty("close");
		expect(UI.icons).toHaveProperty("check");
		expect(UI.icons).toHaveProperty("chevronDown");
		expect(UI.icons).toHaveProperty("plus");
		expect(UI.icons).toHaveProperty("menu");
	});

	test("UI.icon function returns icon references", () => {
		UIIconResource.setIcons({ myCustomIcon: "<svg>custom</svg>" });
		let icon = UI.icon("myCustomIcon");
		expect(icon.toString()).toBe("<svg>custom</svg>");
	});

	test("UI.icon returns same reference as UIIconResource.getIcon", () => {
		let ref1 = UI.icon("check");
		let ref2 = UIIconResource.getIcon("check");
		expect(ref1).toBe(ref2);
	});
});

describe("Icon RTL mirroring", () => {
	test("setMirrorRTL sets mirror flag", () => {
		let icon = new UIIconResource("<svg>arrow</svg>").setMirrorRTL();
		expect(icon.isMirrorRTL()).toBe(true);
	});

	test("setMirrorRTL with false clears mirror flag", () => {
		let icon = new UIIconResource("<svg>arrow</svg>").setMirrorRTL(false);
		expect(icon.isMirrorRTL()).toBe(false);
	});

	test("Default icon is not mirrored", () => {
		let icon = new UIIconResource("<svg>normal</svg>");
		expect(icon.isMirrorRTL()).toBe(false);
	});

	test("Icon reference preserves RTL flag", () => {
		let mirroredIcon = new UIIconResource("<svg>mirrored</svg>").setMirrorRTL();
		UIIconResource.setIcons({ mirroredRef: mirroredIcon });
		let iconRef = UIIconResource.getIcon("mirroredRef");
		expect(iconRef.isMirrorRTL()).toBe(true);
	});
});
