import { describe, expect, test } from "../../dist/index.js";
// ... from "@desk-framework/test"

describe.parallel("Async tests", (scope) => {
	scope.setTimeout(1000);

	let initialized = false;
	scope.beforeEach(async (t) => {
		await t.sleep(1);
		initialized = true;
	});

	test("After init", () => {
		expect(initialized).toBe(true);
	});

	test("Sleepy", async (t) => {
		await t.sleep(50);
		// ... 50ms later
	});

	test("Async poll", async (t) => {
		let times = 0;
		await t.pollAsync(() => {
			// runs every 50ms
			times++;
			if (times >= 3) return true;
		}, 50);
		// ... ~150ms later
	});

	test("Async error handling", async (t) => {
		// catch async errors and handle them
		let err = await t.tryRunAsync(async () => {
			await t.sleep(50);
			throw Error("oops");
		});
		expect(err).toHaveProperty("message").toBe("oops");
	});
});
