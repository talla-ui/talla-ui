import { describe, expect, test } from "../../dist/index.js";
// ... from "@desk-framework/test"

describe("First level", (scope) => {
	let order: string[] = [];

	scope.beforeAll(() => {
		order.push("all1");
	});
	scope.beforeEach(() => {
		order.push("each1");
	});

	describe("Second level", () => {
		describe("Third level", (scope3) => {
			scope3.beforeAll(() => {
				order.push("all3");
			});
			scope3.beforeEach(() => {
				order.push("each3");
			});
			scope3.afterEach(() => {
				order.push("after");
			});

			test("Nested", () => {
				expect(order).toBeArray(["all1", "all3", "each1", "each3"]);
			});
		});
	});

	test("More", () => {
		expect(order).toBeArray([
			"all1",
			"all3",
			"each1",
			"each3",
			"after",
			"each1",
		]);
	});
});
