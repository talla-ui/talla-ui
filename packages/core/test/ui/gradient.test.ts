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
