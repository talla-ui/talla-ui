import { AppException, AsyncTaskQueue, app } from "../../../dist/index.js";
import { describe, test, expect } from "@desk-framework/test";

describe("Scheduler", () => {
	test("Create a queue", () => {
		let s = Symbol();
		let q = app.scheduler.createQueue(s);
		expect(q).toBeInstanceOf(AsyncTaskQueue);
		expect(q.name).toBe(s);
		expect(q.options.parallel).toBe(1);
		expect(q.errors).toBeArray(0);
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

	describe("Synchronous tasks", (scope) => {
		scope.afterAll(() => {
			app.clear(); // remove all queues
		});

		test("Single task", (t) => {
			let q = app.scheduler.createQueue(Symbol());
			q.add(() => {
				t.count("task");
			});
			expect(q.count).toBe(1);
			q.run();
			t.expectCount("task").toBe(1);
			expect(q.count).toBe(0);
		});

		test("Single task with error, not caught", (t) => {
			let q = app.scheduler.createQueue(Symbol());
			q.add(() => {
				throw Error("foo");
			});
			let uncaught = t.tryRun(() => {
				q.run();
			});
			expect(q.count).toBe(0);
			expect(uncaught).asString().toMatchRegExp(/foo/);
		});

		test("Single task with error, caught", (t) => {
			let q = app.scheduler.createQueue(Symbol(), false, (options) => {
				options.catchErrors = true;
			});
			q.add(() => {
				throw Error("foo");
			});
			let none = t.tryRun(() => {
				q.run();
			});
			expect(q.count).toBe(0);
			expect(none).toBeUndefined(); // no error
			expect(q.errors).toBeArray(1);
		});

		test("Single task, stopped", (t) => {
			let q = app.scheduler.createQueue(Symbol());
			q.add(() => {
				t.count("task");
			});
			app.scheduler.stopAll();
			expect(q.count).toBe(0);
			q.run();
			t.expectCount("task").toBe(0);
			expect(q.errors).toBeArray(0);
		});

		test("Single task, replaced", (t) => {
			let q = app.scheduler.createQueue(Symbol());
			q.addOrReplace("foo", () => {
				t.log("Ran task1");
				t.count("task1");
			});
			q.addOrReplace("foo", () => {
				t.log("Ran task2");
				t.count("task2");
			});
			expect(q.count).toBe(1);
			q.run();
			q.addOrReplace("foo", () => {
				t.log("Ran task3");
				t.count("task3");
			});
			q.run();
			t.expectCount("task1").toBe(0);
			t.expectCount("task2").toBe(1);
			t.expectCount("task3").toBe(1);
			expect(q.count).toBe(0);
		});

		test("Two tasks, stopped in between", (t) => {
			let q = app.scheduler.createQueue(Symbol());
			q.add(() => {
				t.count("task");
				q.stop();
			});
			q.add(() => {
				t.count("task");
			});
			q.run();
			t.expectCount("task").toBe(1);
			expect(q.errors).toBeArray(0);
		});

		test("Two tasks, paused in between", (t) => {
			let q = app.scheduler.createQueue(Symbol());
			q.add(() => {
				t.count("task");
				q.pause();
			});
			q.add(() => {
				t.count("task");
			});
			q.run();
			t.expectCount("task").toBe(1);
			expect(q.count).toBe(1);
			q.run();
			t.expectCount("task").toBe(1);
			expect(q.count).toBe(1);
			q.resume();
			q.run();
			t.expectCount("task").toBe(2);
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
			expect(a).toBeArray([2, 1]);
		});

		test("Synchronous tasks, async completion", async (t) => {
			let q = app.scheduler.createQueue(Symbol());
			q.add(() => {
				t.count("task");
			});
			q.add(() => {
				t.count("task");
			});
			await q.waitAsync();
			t.expectCount("task").toBe(2);
		});

		test("Synchronous tasks, async completion, stopped", async (t) => {
			let q = app.scheduler.createQueue(Symbol());
			q.add(() => {
				t.count("task");
				q.stop();
			});
			q.add(() => {
				t.count("task");
			});
			let stopped = await t.tryRunAsync(async () => {
				await q.waitAsync();
			});
			expect(stopped).not.toBeUndefined();
			t.expectCount("task").toBe(1);
		});

		test("Max sync run time", () => {
			let q = app.scheduler.createQueue(Symbol(), false, (options) => {
				options.maxSyncTime = 2;
			});
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
		test("Single async task", async (t) => {
			let q = app.scheduler.createQueue(Symbol());
			q.add(async () => {
				await t.sleep(1);
				t.count("task");
			});
			await q.waitAsync();
			expect(q.count).toBe(0);
			t.expectCount("task").toBe(1);
		});

		test("Single async task with error, not caught", async (t) => {
			let q = app.scheduler.createQueue(Symbol());
			q.add(async () => {
				await t.sleep(1);
				throw Error("foo");
			});
			let uncaught = await t.tryRunAsync(async () => {
				await q.waitAsync();
			});
			expect(q.count).toBe(0);
			expect(uncaught).asString().toMatchRegExp(/foo/);
		});

		test("Single async task with error, not caught", async (t) => {
			let q = app.scheduler.createQueue(Symbol(), false, (options) => {
				options.catchErrors = true;
			});
			q.add(async () => {
				await t.sleep(1);
				throw Error("foo");
			});
			let none = await t.tryRunAsync(async () => {
				await q.waitAsync();
			});
			expect(q.count).toBe(0);
			expect(none).toBeUndefined(); // no error
			expect(q.errors).toBeArray(1);
		});

		test("Single async task, stopped", async (t) => {
			let q = app.scheduler.createQueue(Symbol());
			q.add(async () => {
				await t.sleep(1);
				t.count("task");
			});
			q.stop();
			await q.waitAsync();
			t.expectCount("task").toBe(0);
			expect(q.errors).toBeArray(0);
		});

		test("Two async tasks, stopped in between", async (t) => {
			let q = app.scheduler.createQueue(Symbol());
			q.add(async () => {
				await t.sleep(1);
				t.count("task");
				q.stop();
			});
			q.add(async () => {
				await t.sleep(1);
				t.count("task");
			});
			try {
				await q.waitAsync();
			} catch {}
			t.expectCount("task").toBe(1);
			expect(q.errors).toBeArray(0);
		});

		test("Two async tasks, paused in between", async (t) => {
			let q = app.scheduler.createQueue(Symbol());
			q.add(async () => {
				await t.sleep(1);
				t.count("task");
				q.pause();
			});
			q.add(async () => {
				await t.sleep(1);
				t.count("task");
			});
			await t.pollAsync(() => !!t.getCount("task"), 5, 1000);
			await t.sleep(10);
			t.expectCount("task").toBe(1);
			q.resume();
			await q.waitAsync();
			t.expectCount("task").toBe(2);
		});

		test("Two async tasks, reverse priority", async (t) => {
			let q = app.scheduler.createQueue(Symbol());
			let a: number[] = [];
			q.add(async () => {
				await t.sleep(1);
				a.push(1);
			}, 10);
			q.add(async () => {
				await t.sleep(1);
				a.push(2);
			}, 1);
			await q.waitAsync();
			expect(a).toBeArray([2, 1]);
		});

		test("Task timeout, single task", async () => {
			let q = app.scheduler.createQueue(Symbol(), false, (options) => {
				options.taskTimeout = 10;
				options.catchErrors = true;
			});
			q.add(async () => {
				await new Promise((resolve) => {
					setTimeout(resolve, 100);
				});
			});
			await q.waitAsync();
			expect(q.errors).toBeArray(1);
			expect((q.errors[0] as AppException).name).toMatchRegExp(/timeout/i);
		});

		test("Parallel tasks", async (t) => {
			let q = app.scheduler.createQueue(Symbol(), false, (options) => {
				options.parallel = 5;
			});
			let resolve!: () => void;
			let p = new Promise<void>((r) => {
				resolve = r;
			});
			const awaiter = async () => {
				t.count("before");
				await p;
				t.count("after");
			};
			for (let i = 0; i < 10; i++) q.add(awaiter);
			t.log("Waiting for 5 tasks to be started");
			await t.pollAsync(() => t.getCount("before") === 5, 5, 1000);
			await t.sleep(10);
			expect(q.count).toBe(10); // nothing resolved yet, 5 running
			t.expectCount("before").toBe(5);
			resolve();
			await q.waitAsync();
			t.expectCount("before").toBe(10);
			t.expectCount("after").toBe(10);
			expect(q.count).toBe(0);
		});

		test("Wait for 1 task remaining", async (t) => {
			let q = app.scheduler.createQueue(Symbol(), false, (options) => {
				options.parallel = 2;
			});
			q.add(async () => {
				t.count("task");
				await t.sleep(10);
			}, 1);
			q.add(async (task) => {
				while (!task.cancelled) {
					await t.sleep(10);
				}
				t.count("cancelled");
			});
			await q.waitAsync(1);
			expect(q.count).toBe(1);
			q.stop();
			t.log("Waiting for cancelled task");
			await t.pollAsync(() => !!t.getCount("cancelled"), 5, 1000);
			expect(q.count).toBe(0);
		});
	});
});
