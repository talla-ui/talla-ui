import {
	NullableArray,
	removeFromNullableArray,
} from "../core/NullableArray.js";
import { errorHandler } from "../errors.js";
import { AppException } from "./AppException.js";

/**
 * A class that creates and manages asynchronous task queues
 */
export class Scheduler {
	/**
	 * Creates a new asynchronous task queue with the provided name and options
	 * @param name The name of the task queue, or a unique symbol to identify it
	 * @param replace True if any existing queues with the same name should be replaced
	 * @param configure A callback function to set additional options for the task queue
	 * @returns A new {@link AsyncTaskQueue} instance
	 */
	createQueue(
		name: string | symbol,
		replace?: boolean,
		configure?: (options: AsyncTaskQueue.Options) => void
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
		let options = new AsyncTaskQueue.Options();
		configure && configure(options);
		let queue = new AsyncTaskQueue(name, options);
		this._queues.push(queue);
		return queue;
	}

	/** Returns the (first) queue with the specified name */
	getQueue(name: string | symbol) {
		return this._queues.find((q) => q.name === name);
	}

	/**
	 * Stops all queues that have been created by this scheduler
	 * @see {@link AsyncTaskQueue.stop}
	 */
	stopAll() {
		for (let q of this._queues) q.stop();
	}

	private _queues: AsyncTaskQueue[] = [];
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
	get count() {
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
	}

	/**
	 * Adds a task to be run asynchronously, possibly replacing a task currently in the queue
	 *
	 * @summary The provided function will be called just like it was provided to {@link AsyncTaskQueue.add add()}, however if a task already existed in the same queue with the same `handle` that task is removed first.
	 *
	 * This mechanism can be used to implement throttling or debouncing. By providing the same handle each time and setting the `throttleDelay` option, only the function added _last_ will be run, once within the specified time frame.
	 *
	 * @param handle A unique handle that identifies the task to be added and/or replaced
	 * @param f The function to be invoked, may be asynchronous
	 * @param priority A number that specifies the priority of this task (a higher number _deprioritizes_ a task, keeping it at the end of the queue)
	 */
	addOrReplace(
		handle: any,
		f: (t: AsyncTaskQueue.Task) => Promise<void> | void,
		priority = 0
	) {
		// remove existing task(s), if any
		for (let q of this._tasks) {
			for (let i = q.length - 1; i >= 0; i--) {
				if (q[i]!.handle === handle) {
					q.splice(i, 1);
					break;
				}
			}
		}

		// create new task and add it to the priority list
		let task = new AsyncQueueTask(this, f);
		task.handle = handle;
		if (!this._tasks[priority]) this._tasks[priority] = [];
		this._tasks[priority]!.push(task);
		this._n++;

		// schedule next run if needed
		this._schedule();
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
	}

	/** Resumes execution of (pending) tasks in this queue */
	resume() {
		// clear paused flag and schedule right away
		this._paused = false;
		this._schedule();
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
		for (let f of this._afterEach) f && f(true);
	}

	/**
	 * Waits until the number of pending tasks is equal to or lower than a specified count (or zero)
	 * - This method is typically used to wait for a queue to be empty, i.e. when all tasks have completed. It can also be used as part of a throttling mechanism where a queue is filled up in batches, or if data needs to be loaded from a server in pages.
	 * @param count The number of pending tasks until which to wait before resolving the returned promise
	 * @returns A promise that's resolved when the number of pending tasks is equal to or lower than the specified count (or zero), or rejected when the queue is stopped.
	 */
	async waitAsync(count = 0) {
		return new Promise<void>((resolve, reject) => {
			const check = (stop?: boolean) => {
				if (stop) {
					// if stopped, reject promise
					return reject(new AsyncTaskQueue.QueueStoppedError());
				}
				if (this.count <= count) {
					// if under limit, resolve now and remove from list
					removeFromNullableArray(this._afterEach, check);
					return resolve();
				}
				// otherwise return false (checked below)
				return false;
			};
			if (check() === false) {
				// add to list, checked after each callback
				this._afterEach.push(check);
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
		if (this._paused) return;

		// run a batch of tasks now, if possible
		let parallel = this.options.parallel;
		let start = (this._lastRun = Date.now());
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
				for (let f of this._afterEach) f && f();
			}
			if (Date.now() > end) break;
		}

		// schedule again if needed
		this._schedule();
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
		for (let f of this._afterEach) f && f();
		this._schedule();
	}

	/** Helper function to reschedule a run, if needed at all */
	private _schedule() {
		if (this._n > 0 && !this._timer && !this._paused) {
			let delay = this.options.throttleDelay;
			if (delay && this._lastRun) delay -= Date.now() - this._lastRun;
			this._timer = setTimeout(this.run.bind(this), Math.max(0, delay));
		}
	}

	private _n = 0;
	private _tasks: AsyncQueueTask[][] = [];
	private _p: AsyncQueueTask[] = [];
	private _paused?: boolean;
	private _afterEach: NullableArray<(stop?: boolean) => void> = [];
	private _lastRun?: number;
	private _timer?: any;
}

export namespace AsyncTaskQueue {
	/** An object with options for a particular {@link AsyncTaskQueue} */
	export class Options {
		/** The number of tasks that can be started (asynchronously) in parallel, defaults to 1 */
		parallel = 1;
		/** True if errors should be added to {@link AsyncTaskQueue.errors} instead of being handled globally */
		catchErrors = false;
		/**
		 * The amount of time (in milliseconds) to run tasks within a synchronous loop, before rescheduling other pending tasks asynchronously, defaults to 100ms
		 * - Set this value to zero to always run all tasks asynchronously. Set it to a higher number to continue running synchronous tasks (and parallel asynchronous tasks) in a tight loop for longer.
		 */
		maxSyncTime = 100;
		/** A delay (in milliseconds) to be added between batches of tasks, defaults to zero */
		throttleDelay = 0;
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
		"Tasks stopped"
	);

	/** An error that's thrown when a task has timed out */
	export const TaskTimeoutError = AppException.type(
		"AsyncTaskTimeout",
		"Task timed out"
	);
}

/** @internal An object that represents an asynchronous task that's scheduled by an {@link AsyncTaskQueue} */
class AsyncQueueTask {
	constructor(
		queue: AsyncTaskQueue,
		f: (t: AsyncTaskQueue.Task) => Promise<void> | void
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
