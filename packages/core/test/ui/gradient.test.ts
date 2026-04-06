import { describe, expect, test } from "vitest";
import { UIColor } from "../../dist/index.js";

describe("UIColor.Gradient construction", () => {
	test("Linear gradient with default angle", () => {
		let g = UIColor.linearGradient(
			180,
			UIColor.oklch(0, 0, 0),
			UIColor.oklch(1, 0, 0),
		);
		expect(g.type).toBe("linear");
		expect(g.angle).toBe(180);
		expect(g.stops.length).toBe(2);
		expect(g.stops[0]!.pos).toBe(0);
		expect(g.stops[1]!.pos).toBe(1);
	});

	test("Linear gradient with explicit angle", () => {
		let g = UIColor.linearGradient(
			90,
			UIColor.oklch(0, 0, 0),
			UIColor.oklch(1, 0, 0),
		);
		expect(g.angle).toBe(90);
		expect(g.stops.length).toBe(2);
	});

	test("Linear gradient with explicit positions", () => {
		let g = UIColor.linearGradient(
			180,
			[UIColor.oklch(0, 0, 0), 0.2],
			[UIColor.oklch(1, 0, 0), 0.8],
		);
		expect(g.stops[0]!.pos).toBe(0.2);
		expect(g.stops[1]!.pos).toBe(0.8);
	});

	test("Auto-distribution of intermediate stops", () => {
		let g = UIColor.linearGradient(
			180,
			UIColor.oklch(0, 0, 0),
			UIColor.oklch(0.33, 0, 0),
			UIColor.oklch(0.66, 0, 0),
			UIColor.oklch(1, 0, 0),
		);
		expect(g.stops[0]!.pos).toBeCloseTo(0, 5);
		expect(g.stops[1]!.pos).toBeCloseTo(1 / 3, 5);
		expect(g.stops[2]!.pos).toBeCloseTo(2 / 3, 5);
		expect(g.stops[3]!.pos).toBeCloseTo(1, 5);
	});

	test("Mixed positioned and auto stops", () => {
		let g = UIColor.linearGradient(
			180,
			UIColor.oklch(0, 0, 0),
			UIColor.oklch(0.5, 0, 0),
			[UIColor.oklch(0.8, 0, 0), 0.8],
			UIColor.oklch(1, 0, 0),
		);
		expect(g.stops[0]!.pos).toBe(0);
		expect(g.stops[1]!.pos).toBeCloseTo(0.4, 5); // evenly between 0 and 0.8
		expect(g.stops[2]!.pos).toBe(0.8);
		expect(g.stops[3]!.pos).toBe(1);
	});

	test("Radial gradient with colors only", () => {
		let g = UIColor.radialGradient(
			UIColor.oklch(1, 0, 0),
			UIColor.oklch(0, 0, 0),
		);
		expect(g.type).toBe("radial");
		expect(g.angle).toBe(0);
		expect(g.stops.length).toBe(2);
		expect(g.stops[0]!.pos).toBe(0);
		expect(g.stops[1]!.pos).toBe(1);
	});

	test("Radial gradient with explicit positions", () => {
		let g = UIColor.radialGradient(
			UIColor.oklch(1, 0, 0),
			[UIColor.oklch(0.5, 0, 0), 0.3],
			UIColor.oklch(0, 0, 0),
		);
		expect(g.stops[0]!.pos).toBe(0);
		expect(g.stops[1]!.pos).toBe(0.3);
		expect(g.stops[2]!.pos).toBe(1);
	});

	test("Conic gradient with colors", () => {
		let g = UIColor.conicGradient(
			0,
			UIColor.oklch(0, 0, 0),
			UIColor.oklch(0.5, 0.15, 30),
			UIColor.oklch(1, 0, 0),
		);
		expect(g.type).toBe("conic");
		expect(g.angle).toBe(0);
		expect(g.stops.length).toBe(3);
		expect(g.stops[0]!.pos).toBe(0);
		expect(g.stops[1]!.pos).toBeCloseTo(0.5, 5);
		expect(g.stops[2]!.pos).toBe(1);
	});

	test("Conic gradient with explicit angle", () => {
		let g = UIColor.conicGradient(
			90,
			UIColor.oklch(0, 0, 0),
			UIColor.oklch(1, 0, 0),
		);
		expect(g.angle).toBe(90);
		expect(g.stops.length).toBe(2);
	});
});

describe("UIColor.stackedGradient", () => {
	test("Stacked gradient with two layers", () => {
		let g1 = UIColor.linearGradient(
			180,
			UIColor.oklch(0, 0, 0),
			UIColor.oklch(1, 0, 0),
		);
		let g2 = UIColor.radialGradient(
			UIColor.oklch(0.5, 0.1, 30),
			UIColor.oklch(0, 0, 0),
		);
		let stacked = UIColor.stackedGradient(g1, g2);
		expect(stacked.type).toBe("stacked");
		expect(stacked.layers.length).toBe(2);
		expect(stacked.layers[0]!.type).toBe("linear");
		expect(stacked.layers[1]!.type).toBe("radial");
	});

	test("Auto-converts UIColor to solid gradient", () => {
		let color = UIColor.oklch(0.5, 0.1, 200);
		let g = UIColor.linearGradient(
			90,
			UIColor.oklch(0, 0, 0),
			UIColor.oklch(1, 0, 0),
		);
		let stacked = UIColor.stackedGradient(g, color);
		expect(stacked.layers.length).toBe(2);
		expect(stacked.layers[1]!.type).toBe("linear");
		expect(stacked.layers[1]!.stops.length).toBe(2);
		expect(stacked.layers[1]!.stops[0]!.color).toBe(color);
		expect(stacked.layers[1]!.stops[1]!.color).toBe(color);
	});

	test("Flattens nested stacked gradients", () => {
		let g1 = UIColor.linearGradient(
			0,
			UIColor.oklch(0, 0, 0),
			UIColor.oklch(1, 0, 0),
		);
		let g2 = UIColor.radialGradient(
			UIColor.oklch(1, 0, 0),
			UIColor.oklch(0, 0, 0),
		);
		let g3 = UIColor.conicGradient(
			0,
			UIColor.oklch(0, 0, 0),
			UIColor.oklch(1, 0, 0),
		);
		let inner = UIColor.stackedGradient(g1, g2);
		let outer = UIColor.stackedGradient(inner, g3);
		expect(outer.type).toBe("stacked");
		expect(outer.layers.length).toBe(3);
		expect(outer.layers[0]!.type).toBe("linear");
		expect(outer.layers[1]!.type).toBe("radial");
		expect(outer.layers[2]!.type).toBe("conic");
	});

	test("Mixed gradients and colors with flattening", () => {
		let g1 = UIColor.linearGradient(
			45,
			UIColor.oklch(0, 0, 0),
			UIColor.oklch(1, 0, 0),
		);
		let inner = UIColor.stackedGradient(g1, UIColor.oklch(0.8, 0, 0));
		let outer = UIColor.stackedGradient(
			UIColor.radialGradient(UIColor.oklch(1, 0, 0), UIColor.oklch(0, 0, 0)),
			inner,
			UIColor.oklch(0.2, 0, 0),
		);
		expect(outer.layers.length).toBe(4);
		expect(outer.layers[0]!.type).toBe("radial");
		expect(outer.layers[1]!.type).toBe("linear");
		expect(outer.layers[2]!.type).toBe("linear"); // auto-converted color
		expect(outer.layers[3]!.type).toBe("linear"); // auto-converted color
	});
});
