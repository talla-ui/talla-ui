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
	expect(q.count).toBe(0);
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
		expect(q.count).toBe(1);
		q.run();
		expect(task).toBe(1);
		expect(q.count).toBe(0);
	});

	test("Single task with error, not caught", () => {
		let q = app.scheduler.createQueue(Symbol());
		q.add(() => {
			throw Error("foo");
		});
		q.run();
		expect(q.count).toBe(0);
		expect(numErrors).toBe(1);
		pendingError = undefined;
	});

	test("Single task with error, caught", () => {
		let q = app.scheduler.createQueue(Symbol(), false, { catchErrors: true });
		q.add(() => {
			throw Error("foo");
		});
		q.run();
		expect(q.count).toBe(0);
		expect(q.errors).toHaveLength(1);
		expect(numErrors).toBe(0);
	});

	test("Single task, stopped", () => {
		let count = 0;
		let q = app.scheduler.createQueue(Symbol());
		q.add(() => {
			count++;
		});
		app.scheduler.stopAll();
		expect(q.count).toBe(0);
		q.run();
		expect(count).toBe(0);
		expect(q.errors).toHaveLength(0);
	});

	test("Single task, replaced", () => {
		let q = app.scheduler.createQueue(Symbol());
		let task1 = false;
		q.addOrReplace("foo", () => {
			task1 = true;
		});
		let task2 = false;
		q.addOrReplace("foo", () => {
			task2 = true;
		});
		expect(q.count).toBe(1);
		q.run();
		let task3 = false;
		q.addOrReplace("foo", () => {
			task3 = true;
		});
		q.run();
		expect(task1).toBe(false);
		expect(task2).toBe(true);
		expect(task3).toBe(true);
		expect(q.count).toBe(0);
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
		expect(q.count).toBe(1);
		q.run();
		expect(count).toBe(1);
		expect(q.count).toBe(1);
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
		expect(q.count).toBe(3);
		q.run();
		expect(q.count).toBe(2);
		q.run();
		expect(q.count).toBe(1);
		q.run();
		expect(q.count).toBe(0);
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
		expect(q.count).toBe(0);
		expect(fired).toBe(1);
	});

	test("Single async task with error, not caught", async () => {
		let q = app.scheduler.createQueue(Symbol());
		q.add(async () => {
			await sleep(1);
			throw Error("foo");
		});
		await q.waitAsync();
		expect(q.count).toBe(0);
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
		expect(q.count).toBe(0);
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
		expect(q.count).toBe(10); // nothing resolved yet, 5 running
		expect(before).toBe(5);
		resolve();
		await q.waitAsync();
		expect(before).toBe(10);
		expect(after).toBe(10);
		expect(q.count).toBe(0);
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
		expect(q.count).toBe(1);
		q.stop();
		console.log("Waiting for cancelled task");
		await expect
			.poll(() => canceled > 0, { interval: 5, timeout: 1000 })
			.toBe(true);
		expect(q.count).toBe(0);
	});
});
