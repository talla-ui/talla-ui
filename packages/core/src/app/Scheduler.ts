import { ConfigOptions } from "@talla-ui/util";
import { errorHandler } from "../errors.js";
import { AppException } from "./AppException.js";

const DEFAULT_QUEUE_NAME = Symbol("default");

/**
 * A class that creates and manages asynchronous task queues
 */
export class Scheduler {
	/**
	 * Creates a new asynchronous task queue with the provided name and options
	 * @param name The name of the task queue, or a unique symbol to identify it
	 * @param replace True if any existing queues with the same name should be replaced
	 * @param config An options object or configuration function to set additional options for the task queue
	 * @returns A new {@link AsyncTaskQueue} instance
	 */
	createQueue(
		name: string | symbol,
		replace?: boolean,
		config?: ConfigOptions.Arg<AsyncTaskQueue.Options>,
	) {
		// stop all and remove queues with the same name first, if required
		if (replace) {
			for (let i = this._queues.length - 1; i >= 0; i--) {
				let q = this._queues[i]!;
				if (q.name === name) {
					q.stop();
					this._queues.splice(i, 1);
				}
			}
		}

		// create the queue with given options
		let queue = new AsyncTaskQueue(name, AsyncTaskQueue.Options.init(config));
		this._queues.push(queue);
		return queue;
	}

	/** Returns the (first) queue with the specified name */
	getQueue(name: string | symbol) {
		return this._queues.find((q) => q.name === name);
	}

	/** Returns the default queue, i.e. a queue that's created with default options */
	getDefault() {
		return this._queues[0]!;
	}

	/** Stops and removes all queues managed by the scheduler */
	clear() {
		let queues = this._queues;
		this._queues = [];
		for (let q of queues) q.stop();
	}

	/** All queues managed by the scheduler, including a default queue */
	private _queues: AsyncTaskQueue[] = [
		new AsyncTaskQueue(DEFAULT_QUEUE_NAME, new AsyncTaskQueue.Options()),
	];
}

/**
 * A class that represents a queue of asynchronous tasks within a {@link Scheduler}
 * - Instances of this class are created using {@link Scheduler.createQueue()}, typically accessed from `app.scheduler`. This allows queues to be managed by the scheduler, replacing and stopping them as needed.
 */
export class AsyncTaskQueue {
	/**
	 * Creates a new task queue
	 * @note You should use {@link Scheduler} to create instances of this class, rather than calling this constructor directly.
	 */
	constructor(name: string | symbol, options: AsyncTaskQueue.Options) {
		this.name = name;
		this.options = options;
	}

	/** The name of this queue */
	readonly name: string | symbol;

	/** The options that were used to create this queue */
	readonly options: Readonly<AsyncTaskQueue.Options>;

	/**
	 * A list of all errors that were caught while running tasks in this queue
	 * - This list is populated only if {@link AsyncTaskQueue.Options.catchErrors} is set.
	 */
	readonly errors: unknown[] = [];

	/** The number of tasks that are currently in this queue */
	get length() {
		return this._n + this._p.length;
	}

	/**
	 * Adds a task to be run asynchronously
	 *
	 * @summary The provided function will be called (while the queue isn't paused), after other tasks in the queue have finished. There's no need to schedule execution or use the {@link run} method to start the task.
	 *
	 * If the function throws an error (or returns a promise that's rejected), the error is logged or otherwise handled globally — unless {@link AsyncTaskQueue.Options.catchErrors} is set, in which case all errors are added to the {@link AsyncTaskQueue.errors errors} array.
	 *
	 * The provided function is invoked with a single argument that represents the task itself. This {@link AsyncTaskQueue.Task} object contains a reference to the queue, as well as a `cancelled` property that's set to true when the queue is stopped or the task has timed out.
	 *
	 * @param f The function to be invoked, may be asynchronous
	 * @param priority A number that specifies the priority of this task (a higher number _deprioritizes_ a task, keeping it at the end of the queue)
	 */
	add(f: (t: AsyncTaskQueue.Task) => Promise<void> | void, priority = 0) {
		let task = new AsyncQueueTask(this, f);

		// add task to given priority list
		if (!this._tasks[priority]) this._tasks[priority] = [];
		this._tasks[priority]!.push(task);
		this._n++;

		// schedule next run if needed
		this._schedule();
		return this;
	}

	/**
	 * Throttles the execution of a task
	 * @summary This method can be used to throttle the execution of a task. The task is invoked immediately if a throttled task has not already been run within the specified time, otherwise a delay is added. If this method is called multiple times, only the last call is considered (i.e there is always only a single throttled task in the queue).
	 * @param f The function to be invoked, may be asynchronous
	 * @param timer The amount of time (in milliseconds) to wait before invoking the function, defaults to zero
	 */
	throttle(f: (t: AsyncTaskQueue.Task) => Promise<void> | void, timer = 0) {
		let wasThrottled = !!this._throttled;
		this._throttled = f;
		this._throttleUntil = this._throttleRan + timer;
		if (!wasThrottled) {
			this.add(async (t) => {
				while (true) {
					if (t.cancelled) return;
					let wait = this._throttleUntil - Date.now();
					if (wait <= 0) break;
					await new Promise((resolve) => setTimeout(resolve, wait));
				}
				let f = this._throttled;
				this._throttled = undefined;
				this._throttleRan = Date.now();
				return f?.(t);
			});
		}
		return this;
	}

	/**
	 * Debounces the execution of a task
	 * @summary This method can be used to debounce the execution of a task. The task is invoked after the specified time, resetting the timer each time this method is called. Only the last call is considered (i.e there is always only a single debounced task in the queue). Since the logic is shared with {@link AsyncTaskQueue.throttle()}, consider creating a separate queue for each debounced or throttled task.
	 * @param f The function to be invoked, may be asynchronous
	 * @param timer The amount of time (in milliseconds) to wait before invoking the function, defaults to zero
	 */
	debounce(f: (t: AsyncTaskQueue.Task) => Promise<void> | void, timer = 0) {
		this._throttleRan = Date.now();
		return this.throttle(f, timer);
	}

	/**
	 * Returns true if the queue is currently paused
	 * @see {@link AsyncTaskQueue.pause}
	 * @see {@link AsyncTaskQueue.resume}
	 */
	isPaused() {
		return !!this._paused;
	}

	/**
	 * Pauses execution of the tasks in this queue
	 * @note Currently running tasks can't be paused, but a paused queue won't invoke pending tasks until the queue is resumed.
	 */
	pause() {
		// just set paused flag, will be checked by run()
		this._paused = true;
		return this;
	}

	/** Resumes execution of (pending) tasks in this queue */
	resume() {
		// clear paused flag and schedule right away
		this._paused = false;
		this._schedule();
		return this;
	}

	/**
	 * Stops this queue, cancelling invocation of pending tasks
	 * @note Currently running tasks can't be stopped, but any tasks that haven't been invoked will no longer run on a stopped queue. Tasks that have already been started should check the `cancelled` property of the {@link AsyncTaskQueue.Task} function argument.
	 */
	stop() {
		this._paused = false;

		// cancel all tasks, clear the queue
		this._tasks = [];
		this._n = 0;
		for (let running of this._p) {
			running.cancelled = true;
		}
		this._p = [];

		// call all afterEach callbacks (from waitAsync)
		for (let f of this._afterEach) f(true);
		return this;
	}

	/**
	 * Waits until the number of pending tasks is equal to or lower than a specified count (or zero)
	 * - This method is typically used to wait for a queue to be empty, i.e. when all tasks have completed. It can also be used as part of a throttling mechanism where a queue is filled up in batches, or if data needs to be loaded from a server in pages.
	 * @param length The number of pending tasks until which to wait before resolving the returned promise
	 * @returns A promise that's resolved when the number of pending tasks is equal to or lower than the specified count (or zero), or rejected when the queue is stopped.
	 */
	async waitAsync(length = 0) {
		return new Promise<void>((resolve, reject) => {
			const check = (stop?: boolean) => {
				if (stop) {
					// if stopped, reject promise
					return reject(new AsyncTaskQueue.QueueStoppedError());
				}
				if (this.length <= length) {
					// if under limit, resolve now and remove from list
					this._afterEach.delete(check);
					return resolve();
				}
				// otherwise return false (checked below)
				return false;
			};
			if (check() === false) {
				// add to list, checked after each callback
				this._afterEach.add(check);
			}
		});
	}

	/**
	 * Invokes pending tasks synchronously
	 * @note It's **not** necessary to call this method manually to start running tasks at all. Queued tasks are scheduled asynchronously as soon as they're added.
	 */
	run() {
		// cancel/remove scheduled run
		if (this._timer) {
			clearTimeout(this._timer);
			this._timer = undefined;
		}
		if (this._paused) return this;

		// run a batch of tasks now, if possible
		let parallel = this.options.parallel;
		let start = Date.now();
		let end = start + this.options.maxSyncTime;
		while (this._n > 0 && this._p.length < parallel && !this._paused) {
			// get the first task to run, and run it
			let list = this._tasks.find((l) => l && l.length > 0);
			let task = list && list.shift();
			if (!task) break;
			let result: Promise<void> | void | undefined;
			try {
				result = task.run();
			} catch (err) {
				// save error to array, or handle globally
				if (this.options.catchErrors) this.errors.push(err);
				else errorHandler(err);
			}
			this._n--;

			if (
				result &&
				typeof result.then === "function" &&
				typeof result.catch === "function"
			) {
				// handle async if result was a promise
				this._handleAsync(task, result);
			} else {
				// not a promise, consider this task done
				for (let f of this._afterEach) f();
			}
			if (Date.now() > end) break;
		}

		// schedule again if needed
		this._schedule();
		return this;
	}

	/** Helper function to handle async task, taking up one parallel slot */
	private async _handleAsync(task: AsyncQueueTask, p: Promise<void>) {
		this._p.push(task);
		let timeout = this.options.taskTimeout;
		let timedOut = false;
		await new Promise<void>((resolve) => {
			if (timeout) {
				// set timeout to cancel task and move on
				setTimeout(() => {
					if (!timedOut) {
						if (this.options.catchErrors) {
							this.errors.push(new AsyncTaskQueue.TaskTimeoutError());
						}
						task!.cancelled = true;
						resolve();
					}
				}, timeout);
			}
			p.then(resolve, (err) => {
				// handle async error
				if (!timedOut) {
					if (this.options.catchErrors) this.errors.push(err);
					else errorHandler(err);
					resolve();
				}
			});
		});

		// remove task from async running list, schedule run again
		this._p = this._p.filter((t) => t !== task);
		for (let f of this._afterEach) f();
		this._schedule();
	}

	/** Helper function to reschedule a run, if needed at all */
	private _schedule() {
		if (this._n > 0 && !this._timer && !this._paused) {
			this._timer = setTimeout(this.run.bind(this), this.options.delayTime);
		}
	}

	private _n = 0;
	private _tasks: AsyncQueueTask[][] = [];
	private _p: AsyncQueueTask[] = [];
	private _paused?: boolean;
	private _afterEach = new Set<(stop?: boolean) => void>();
	private _timer?: any;
	private _throttleUntil = 0;
	private _throttleRan = 0;
	private _throttled?: (t: AsyncTaskQueue.Task) => Promise<void> | void;
}

export namespace AsyncTaskQueue {
	/** An object with options for a particular {@link AsyncTaskQueue} */
	export class Options extends ConfigOptions {
		/** The number of tasks that can be started (asynchronously) in parallel, defaults to 1 */
		parallel = 1;
		/** True if errors should be added to {@link AsyncTaskQueue.errors} instead of being handled globally */
		catchErrors = false;
		/**
		 * The amount of time (in milliseconds) to run tasks within a synchronous loop, before rescheduling other pending tasks asynchronously, defaults to 100ms
		 * - Set this value to zero to always run all tasks asynchronously. Set it to a higher number to continue running synchronous tasks (and parallel asynchronous tasks) in a tight loop for longer.
		 */
		maxSyncTime = 100;
		/** The amount of time (in milliseconds) to wait before scheduling the next asynchronous run, defaults to zero */
		delayTime = 0;
		/** A timeout value (in milliseconds) for each task, if any */
		taskTimeout?: number;
	}

	/** An object that's passed as an argument to each task function */
	export type Task = {
		queue: AsyncTaskQueue;
		cancelled: boolean;
	};

	/** An error that's used to reject the promise returned by {@link AsyncTaskQueue.waitAsync()} */
	export const QueueStoppedError = AppException.type(
		"AsyncQueueStopped",
		"Tasks stopped",
	);

	/** An error that's thrown when a task has timed out */
	export const TaskTimeoutError = AppException.type(
		"AsyncTaskTimeout",
		"Task timed out",
	);
}

/** @internal An object that represents an asynchronous task that's scheduled by an {@link AsyncTaskQueue} */
class AsyncQueueTask {
	constructor(
		queue: AsyncTaskQueue,
		f: (t: AsyncTaskQueue.Task) => Promise<void> | void,
	) {
		this.queue = queue;
		this.run = () => f(this);
	}

	/** The queue that this task is/was in */
	queue: AsyncTaskQueue;

	/** True if the task has been cancelled */
	cancelled = false;

	/** Handle used for {@link AsyncTaskQueue.addOrReplace()} */
	handle: any;

	run: () => Promise<void> | void;
}
