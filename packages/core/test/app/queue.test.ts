import { beforeEach, describe, expect, test } from "vitest";
import { app } from "../../dist/index.js";

beforeEach(() => {
	app.clear();
});

describe("AppQueue", () => {
	test("schedule adds tasks", () => {
		app.schedule(() => {});
		expect(app.queue.length).toBe(1);
	});

	test("run executes tasks", () => {
		let ran = false;
		app.schedule(() => {
			ran = true;
		});
		app.queue.run();
		expect(ran).toBe(true);
		expect(app.queue.length).toBe(0);
	});

	test("run executes tasks in FIFO order", () => {
		const order: number[] = [];
		app.schedule(() => order.push(1));
		app.schedule(() => order.push(2));
		app.schedule(() => order.push(3));
		app.queue.run();
		expect(order).toEqual([1, 2, 3]);
	});

	test("run respects time budget", () => {
		let count = 0;
		const runFor5ms = () => {
			count++;
			let start = Date.now();
			while (Date.now() < start + 5) {
				// busy wait
			}
		};
		for (let i = 0; i < 10; i++) {
			app.schedule(runFor5ms);
		}
		app.queue.run(10); // 10ms budget
		expect(count).toBeLessThan(10);
		expect(app.queue.length).toBeGreaterThan(0);
	});

	test("waitAsync drains queue", async () => {
		let done = false;
		app.schedule(() => {
			done = true;
		});
		await app.queue.waitAsync();
		expect(done).toBe(true);
		expect(app.queue.length).toBe(0);
	});

	test("waitAsync handles multiple tasks", async () => {
		const order: number[] = [];
		app.schedule(() => order.push(1));
		app.schedule(() => order.push(2));
		app.schedule(() => order.push(3));
		await app.queue.waitAsync();
		expect(order).toEqual([1, 2, 3]);
	});

	test("waitAsync returns immediately when queue is empty", async () => {
		expect(app.queue.length).toBe(0);
		let start = Date.now();
		await app.queue.waitAsync();
		expect(Date.now() - start).toBeLessThan(10);
	});

	test("waitAsync with timeout resolves early", async () => {
		// Schedule a task that won't run immediately due to timer delay
		app.queue.run(0, 1000); // Set a long delay
		app.schedule(() => {});
		let start = Date.now();
		await app.queue.waitAsync(50);
		let elapsed = Date.now() - start;
		expect(elapsed).toBeGreaterThanOrEqual(40);
		expect(elapsed).toBeLessThan(200);
	});

	test("multiple waitAsync calls all resolve when queue drains", async () => {
		app.schedule(() => {});
		let resolved = 0;
		const p1 = app.queue.waitAsync().then(() => resolved++);
		const p2 = app.queue.waitAsync().then(() => resolved++);
		const p3 = app.queue.waitAsync().then(() => resolved++);
		app.queue.run();
		await Promise.all([p1, p2, p3]);
		expect(resolved).toBe(3);
	});

	test("sticky delay persists across runs", () => {
		app.queue.run(0, 5); // Set delay to 5ms
		app.schedule(() => {});
		// Can't easily test timer value, but we can verify no errors
		expect(app.queue.length).toBe(1);
		app.queue.run(); // Should use 5ms delay
		expect(app.queue.length).toBe(0);
	});

	test("clear resets queue", () => {
		app.schedule(() => {});
		app.schedule(() => {});
		expect(app.queue.length).toBe(2);
		app.queue.clear();
		expect(app.queue.length).toBe(0);
	});

	test("clear also clears pending waiters", async () => {
		app.queue.run(0, 1000); // Set a long delay
		app.schedule(() => {});
		let resolved = false;
		app.queue.waitAsync().then(() => {
			resolved = true;
		});
		app.queue.clear();
		// Give time for any pending microtasks
		await Promise.resolve();
		await Promise.resolve();
		expect(resolved).toBe(false);
	});

	test("app.clear() also clears queue", () => {
		app.schedule(() => {});
		expect(app.queue.length).toBe(1);
		app.clear();
		expect(app.queue.length).toBe(0);
	});
});

describe("app.schedule()", () => {
	test("should schedule and run a synchronous task", async () => {
		let ran = false;
		app.schedule(() => {
			ran = true;
		});
		await app.queue.waitAsync();
		expect(ran).toBe(true);
	});
});
