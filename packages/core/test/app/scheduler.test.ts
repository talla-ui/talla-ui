import { afterAll, beforeEach, describe, expect, test } from "vitest";
import {
	AppContext,
	AppException,
	AsyncTaskQueue,
	app,
} from "../../dist/index.js";

let numErrors = 0;
let pendingError: any;
beforeEach((c) => {
	numErrors = 0;
	pendingError = undefined;
	AppContext.setErrorHandler((e) => {
		numErrors++;
		pendingError ||= e;
		c.onTestFinished(() => {
			if (pendingError) throw pendingError;
		});
	});
});

test("Create a queue", () => {
	let s = Symbol();
	let q = app.scheduler.createQueue(s);
	expect(q).toBeInstanceOf(AsyncTaskQueue);
	expect(q.name).toBe(s);
	expect(q.options.parallel).toBe(1);
	expect(q.errors).toHaveLength(0);
	expect(q.length).toBe(0);
});

test("Retrieve a named queue", () => {
	let s = Symbol();
	let q = app.scheduler.createQueue(s);
	expect(app.scheduler.getQueue(s)).toBe(q);
});

test("Replace a named queue", () => {
	let s = Symbol();
	app.scheduler.createQueue(s);
	app.scheduler.createQueue(s);
	let q2 = app.scheduler.createQueue(s, true);
	expect(app.scheduler.getQueue(s)).toBe(q2);
});

describe("app.schedule()", () => {
	test("should schedule and run a synchronous task", async () => {
		let ran = false;
		app.schedule(() => {
			ran = true;
		});
		// Wait for the default queue to process the task
		await app.scheduler.getDefault().waitAsync();
		expect(ran).toBe(true);
	});

	test("should schedule and run an async task", async () => {
		let ran = false;
		app.schedule(async () => {
			await new Promise((r) => setTimeout(r, 1));
			ran = true;
		});
		await app.scheduler.getDefault().waitAsync();
		expect(ran).toBe(true);
	});

	test("should pass the task argument", async () => {
		let gotTask = false;
		app.schedule((task) => {
			if (task && typeof task.cancelled === "boolean") gotTask = true;
		});
		await app.scheduler.getDefault().waitAsync();
		expect(gotTask).toBe(true);
	});

	test("should respect priority argument", async () => {
		let order: number[] = [];
		app.schedule(() => {
			order.push(1);
		}, 10);
		app.schedule(() => {
			order.push(2);
		}, 1);
		await app.scheduler.getDefault().waitAsync();
		expect(order).toEqual([2, 1]);
	});
});

describe("Synchronous tasks", () => {
	afterAll(() => {
		app.clear(); // remove all queues
	});

	test("Single task", () => {
		let task = 0;
		let q = app.scheduler.createQueue(Symbol());
		q.add(() => {
			task++;
		});
		expect(q.length).toBe(1);
		q.run();
		expect(task).toBe(1);
		expect(q.length).toBe(0);
	});

	test("Single task with error, not caught", () => {
		let q = app.scheduler.createQueue(Symbol());
		q.add(() => {
			throw Error("foo");
		});
		q.run();
		expect(q.length).toBe(0);
		expect(numErrors).toBe(1);
		pendingError = undefined;
	});

	test("Single task with error, caught", () => {
		let q = app.scheduler.createQueue(Symbol(), false, { catchErrors: true });
		q.add(() => {
			throw Error("foo");
		});
		q.run();
		expect(q.length).toBe(0);
		expect(q.errors).toHaveLength(1);
		expect(numErrors).toBe(0);
	});

	test("Single task, stopped", () => {
		let count = 0;
		let q = app.scheduler.createQueue(Symbol());
		q.add(() => {
			count++;
		});
		app.scheduler.clear();
		expect(q.length).toBe(0);
		q.run();
		expect(count).toBe(0);
		expect(q.errors).toHaveLength(0);
	});

	test("Two tasks, stopped in between", () => {
		let count = 0;
		let q = app.scheduler.createQueue(Symbol());
		q.add(() => {
			count++;
			q.stop();
		});
		q.add(() => {
			count++;
		});
		q.run();
		expect(count).toBe(1);
		expect(q.errors).toHaveLength(0);
	});

	test("Two tasks, paused in between", () => {
		let count = 0;
		let q = app.scheduler.createQueue(Symbol());
		q.add(() => {
			count++;
			q.pause();
		});
		q.add(() => {
			count++;
		});
		q.run();
		expect(count).toBe(1);
		expect(q.length).toBe(1);
		q.run();
		expect(count).toBe(1);
		expect(q.length).toBe(1);
		q.resume();
		q.run();
		expect(count).toBe(2);
	});

	test("Two tasks, reverse priority", () => {
		let q = app.scheduler.createQueue(Symbol());
		let a: number[] = [];
		q.add(() => {
			a.push(1);
		}, 10);
		q.add(() => {
			a.push(2);
		}, 1);
		q.run();
		expect(a).toEqual([2, 1]);
	});

	test("Synchronous tasks, async completion", async () => {
		let count = 0;
		let q = app.scheduler.createQueue(Symbol());
		q.add(() => {
			count++;
		});
		q.add(() => {
			count++;
		});
		await q.waitAsync();
		expect(count).toBe(2);
	});

	test("Synchronous tasks, async completion, stopped", async () => {
		let count = 0;
		let q = app.scheduler.createQueue(Symbol());
		q.add(() => {
			count++;
			q.stop();
		});
		q.add(() => {
			count++;
		});
		await expect(q.waitAsync()).rejects.toThrow(/stopped/);
		expect(count).toBe(1);
	});

	test("Max sync run time", () => {
		let q = app.scheduler.createQueue(Symbol(), false, { maxSyncTime: 2 });
		const runFor5ms = () => {
			let start = Date.now();
			// do something silly for > 5ms
			while (Date.now() < start + 5) {
				runFor5ms.toString().split("").join("|").split("");
			}
		};
		q.add(runFor5ms);
		q.add(runFor5ms);
		q.add(runFor5ms);
		expect(q.length).toBe(3);
		q.run();
		expect(q.length).toBe(2);
		q.run();
		expect(q.length).toBe(1);
		q.run();
		expect(q.length).toBe(0);
	});
});

describe("Asynchronous tasks", () => {
	function sleep(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	test("Single async task", async () => {
		let q = app.scheduler.createQueue(Symbol());
		let fired = 0;
		q.add(async () => {
			await sleep(1);
			fired++;
		});
		await q.waitAsync();
		expect(q.length).toBe(0);
		expect(fired).toBe(1);
	});

	test("Single async task with error, not caught", async () => {
		let q = app.scheduler.createQueue(Symbol());
		q.add(async () => {
			await sleep(1);
			throw Error("foo");
		});
		await q.waitAsync();
		expect(q.length).toBe(0);
		expect(String(pendingError)).toMatch(/foo/);
		pendingError = undefined;
	});

	test("Single async task with error, caught", async () => {
		let q = app.scheduler.createQueue(Symbol(), false, { catchErrors: true });
		q.add(async () => {
			await sleep(1);
			throw Error("foo");
		});
		await q.waitAsync();
		expect(q.length).toBe(0);
		expect(numErrors).toBe(0);
		expect(q.errors).toHaveLength(1);
	});

	test("Single async task, stopped", async () => {
		let q = app.scheduler.createQueue(Symbol());
		let fired = 0;
		q.add(async () => {
			await sleep(1);
			fired++;
		});
		q.stop();
		await q.waitAsync();
		expect(fired).toBe(0);
	});

	test("Two async tasks, stopped in between", async () => {
		let q = app.scheduler.createQueue(Symbol());
		let count = 0;
		q.add(async () => {
			await sleep(1);
			count++;
			q.stop();
		});
		q.add(async () => {
			await sleep(1);
			count++;
		});
		let p = q.waitAsync().catch((err) => err);
		expect(count).toBe(0);
		expect(q.errors).toHaveLength(0);
		expect(String(await p)).toMatch(/stopped/);
	});

	test("Two async tasks, paused in between", async () => {
		let count = 0;
		let q = app.scheduler.createQueue(Symbol());
		q.add(async () => {
			await sleep(1);
			count++;
			q.pause();
		});
		q.add(async () => {
			await sleep(1);
			count++;
		});
		await expect
			.poll(() => count > 0, { interval: 5, timeout: 1000 })
			.toBe(true);
		await sleep(10);
		expect(count).toBe(1);
		q.resume();
		await q.waitAsync();
		expect(count).toBe(2);
	});

	test("Two async tasks, reverse priority", async () => {
		let q = app.scheduler.createQueue(Symbol());
		let a: number[] = [];
		q.add(async () => {
			await sleep(1);
			a.push(1);
		}, 10);
		q.add(async () => {
			await sleep(1);
			a.push(2);
		}, 1);
		await q.waitAsync();
		expect(a).toEqual([2, 1]);
	});

	test("Task timeout, single task", async () => {
		let q = app.scheduler.createQueue(Symbol(), false, {
			taskTimeout: 10,
			catchErrors: true,
		});
		q.add(async () => {
			await new Promise((resolve) => {
				setTimeout(resolve, 100);
			});
		});
		await q.waitAsync();
		expect(q.errors).toHaveLength(1);
		expect((q.errors[0] as AppException).name).toMatch(/timeout/i);
	});

	test("Parallel tasks", async () => {
		let before = 0;
		let after = 0;
		let q = app.scheduler.createQueue(Symbol(), false, { parallel: 5 });
		let resolve!: () => void;
		let p = new Promise<void>((r) => {
			resolve = r;
		});
		const awaiter = async () => {
			before++;
			await p;
			after++;
		};
		for (let i = 0; i < 10; i++) q.add(awaiter);
		console.log("Waiting for 5 tasks to be started");
		await expect
			.poll(() => before === 5, { interval: 5, timeout: 1000 })
			.toBe(true);
		await sleep(10);
		expect(q.length).toBe(10); // nothing resolved yet, 5 running
		expect(before).toBe(5);
		resolve();
		await q.waitAsync();
		expect(before).toBe(10);
		expect(after).toBe(10);
		expect(q.length).toBe(0);
	});

	test("Wait for 1 task remaining", async () => {
		let count = 0;
		let canceled = 0;
		let q = app.scheduler.createQueue(Symbol(), false, { parallel: 2 });
		q.add(async () => {
			count++;
			await sleep(10);
		}, 1);
		q.add(async (task) => {
			while (!task.cancelled) {
				await sleep(10);
			}
			canceled++;
		});
		await q.waitAsync(1);
		expect(q.length).toBe(1);
		q.stop();
		console.log("Waiting for cancelled task");
		await expect
			.poll(() => canceled > 0, { interval: 5, timeout: 1000 })
			.toBe(true);
		expect(q.length).toBe(0);
	});
});

describe("Throttle", () => {
	function sleep(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	test("Throttle executes immediately on first call", async () => {
		let q = app.scheduler.createQueue(Symbol());
		let executed = false;
		let executionTime = 0;

		const startTime = Date.now();
		q.throttle(() => {
			executed = true;
			executionTime = Date.now() - startTime;
		}, 50);

		await q.waitAsync();
		expect(executed).toBe(true);
		expect(executionTime).toBeLessThan(20);
	});

	test("Throttle enforces minimum time between executions", async () => {
		let q = app.scheduler.createQueue(Symbol());
		let executions: number[] = [];
		const startTime = Date.now();

		// runs immediately (async)
		q.throttle(() => {
			executions.push(Date.now() - startTime);
		}, 40);
		await q.waitAsync();

		// waits for timer
		q.throttle(() => {
			executions.push(Date.now() - startTime);
		}, 40);
		await q.waitAsync();

		expect(executions).toHaveLength(2);
		expect(executions[0]!).toBeLessThan(20);
		expect(executions[1]! - executions[0]!).toBeGreaterThanOrEqual(35);
	});

	test("Throttle replaces pending task with latest call", async () => {
		let q = app.scheduler.createQueue(Symbol());
		let lastValue = "";

		q.throttle(() => {
			lastValue = "first";
		}, 30);
		q.throttle(() => {
			lastValue = "second";
		}, 30);
		q.throttle(() => {
			lastValue = "third";
		}, 30);

		await q.waitAsync();
		expect(lastValue).toBe("third");
	});

	test("Throttle with zero timer executes immediately", async () => {
		let q = app.scheduler.createQueue(Symbol());
		let executed = false;

		q.throttle(() => {
			executed = true;
		}, 0);
		q.run(); // synchronous
		expect(executed).toBe(true);
	});

	test("Throttle respects task cancellation", async () => {
		let q = app.scheduler.createQueue(Symbol());
		let executed = false;

		q.throttle(async () => {
			executed = true;
		}, 20);
		q.stop();

		await sleep(30); // Wait longer than the throttle timer
		expect(executed).toBe(false);
	});

	test("Throttle handles async functions", async () => {
		let q = app.scheduler.createQueue(Symbol());
		let result = 0;
		q.throttle(async () => {
			await sleep(10);
			result = 42;
		}, 20);
		await q.waitAsync();
		expect(result).toBe(42);
	});

	test("Multiple throttle calls with different timers", async () => {
		let q = app.scheduler.createQueue(Symbol());
		let executions: string[] = [];
		let startTime = Date.now();

		// Block next call by running synchronously first
		q.throttle(() => {}, 0);
		q.run();

		// Call with shorter timer first
		q.throttle(() => {
			executions.push("short");
		}, 20);

		// Wait a bit, then call with longer timer
		await sleep(1);
		q.throttle(() => {
			executions.push("long");
		}, 50);

		await q.waitAsync();
		expect(executions).toEqual(["long"]);
		expect(Date.now() - startTime).toBeGreaterThan(40);
	});
});

describe("Debounce", () => {
	function sleep(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	test("Debounce delays execution", async () => {
		let q = app.scheduler.createQueue(Symbol());
		let executed = false;
		q.debounce(() => {
			executed = true;
		}, 30);

		// Check immediately - should not be executed yet
		await sleep(5);
		expect(executed).toBe(false);

		// Wait for debounce timer
		await q.waitAsync();
		expect(executed).toBe(true);
	});

	test("Debounce resets timer on subsequent calls", async () => {
		let q = app.scheduler.createQueue(Symbol());
		let executions = 0;

		// First call
		q.debounce(() => {
			executions++;
		}, 40);

		// Wait a bit, then call again - should reset the timer
		await sleep(20);
		q.debounce(() => {
			executions++;
		}, 40);

		// Wait another bit, call again - should reset timer again
		await sleep(20);
		q.debounce(() => {
			executions++;
		}, 40);

		// Now wait for the final execution
		await q.waitAsync();
		expect(executions).toBe(1); // Only the last call should execute
	});

	test("Debounce replaces pending task with latest call", async () => {
		let q = app.scheduler.createQueue(Symbol());
		let lastValue = "";

		q.debounce(() => {
			lastValue = "first";
		}, 25);

		q.debounce(() => {
			lastValue = "second";
		}, 25);

		q.debounce(() => {
			lastValue = "third";
		}, 25);

		await q.waitAsync();
		expect(lastValue).toBe("third"); // Only the last debounced function should execute
	});

	test("Debounce with zero timer executes immediately", async () => {
		let q = app.scheduler.createQueue(Symbol());
		let executed = false;
		q.debounce(() => {
			executed = true;
		}, 0);
		q.run(); // synchronous
		expect(executed).toBe(true);
	});

	test("Debounce respects task cancellation", async () => {
		let q = app.scheduler.createQueue(Symbol());
		let executed = false;
		q.debounce(async () => {
			executed = true;
		}, 20);
		q.stop();
		await sleep(30); // Wait longer than the debounce timer
		expect(executed).toBe(false);
	});

	test("Debounce handles async functions", async () => {
		let q = app.scheduler.createQueue(Symbol());
		let result = 0;
		q.debounce(async () => {
			await sleep(10);
			result = 99;
		}, 15);
		await q.waitAsync();
		expect(result).toBe(99);
	});
});
