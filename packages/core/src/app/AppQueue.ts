import { safeCall } from "../errors.js";

/**
 * A simple task queue for scheduling and running asynchronous tasks
 *
 * @description
 * This class provides a minimal task queue that executes tasks in FIFO order
 * with time-budgeted batching. It's used internally by the application context
 * and renderers to coordinate UI updates and deferred operations.
 *
 * Access the singleton instance via {@link AppContext.queue app.queue}.
 */
export class AppQueue {
	private _tasks: (() => void)[] = [];
	private _cursor = 0;
	private _waiters: (() => void)[] = [];
	private _timer?: ReturnType<typeof setTimeout>;
	private _delayedTimers = new Set<ReturnType<typeof setTimeout>>();
	private _delay = 0;
	private _onSchedule?: () => void;

	/** The number of pending tasks in the queue */
	get length() {
		return this._tasks.length - this._cursor;
	}

	/**
	 * Adds a task to the queue
	 * @param f The function to execute
	 * @param delay Optional delay in milliseconds before adding to queue
	 */
	schedule(f: () => void, delay?: number) {
		if (delay !== undefined) {
			let timer = setTimeout(() => {
				this._delayedTimers.delete(timer);
				this.schedule(f);
			}, delay);
			this._delayedTimers.add(timer);
			return;
		}
		let wasEmpty = this._tasks.length === this._cursor;
		this._tasks.push(f);
		if (this._timer == null) {
			this._scheduleTimer();
		}
		if (wasEmpty) {
			this._onSchedule?.();
		}
	}

	/**
	 * Runs queued tasks until time budget is exhausted
	 * @param maxSyncTime Maximum milliseconds to spend running tasks (default 100)
	 * @param delayNext Delay in ms for the next auto-scheduled run (sticky)
	 */
	run(maxSyncTime = 100, delayNext?: number) {
		clearTimeout(this._timer);
		this._timer = undefined;

		if (delayNext !== undefined) {
			this._delay = delayNext;
		}

		let deadline = performance.now() + maxSyncTime;
		while (this._cursor < this._tasks.length && performance.now() < deadline) {
			safeCall(this._tasks[this._cursor++]!);
		}

		// compact when fully drained
		if (this._cursor >= this._tasks.length) {
			this._tasks.length = 0;
			this._cursor = 0;
		}

		if (this._cursor < this._tasks.length) {
			this._scheduleTimer();
		} else {
			// Resolve all waiters when queue is empty
			let waiters = this._waiters;
			this._waiters = [];
			for (let w of waiters) w();
		}
	}

	/**
	 * Waits for all pending tasks to complete
	 * @param timeout Optional timeout in milliseconds; resolves early if timeout expires
	 */
	waitAsync(timeout?: number): Promise<void> {
		if (this._tasks.length === this._cursor) {
			return Promise.resolve();
		}
		return new Promise((resolve) => {
			let resolved = false;
			const done = () => {
				if (!resolved) {
					resolved = true;
					resolve();
				}
			};
			this._waiters.push(done);
			if (timeout !== undefined) {
				setTimeout(done, timeout);
			}
		});
	}

	/** Clears all pending tasks and resets the timer */
	clear() {
		clearTimeout(this._timer);
		for (let timer of this._delayedTimers) {
			clearTimeout(timer);
		}
		this._delayedTimers.clear();
		this._timer = undefined;
		this._tasks = [];
		this._cursor = 0;
		this._waiters = [];
		this._delay = 0;
		this._onSchedule = undefined;
	}

	/**
	 * Sets the callback to be invoked when tasks are scheduled
	 * - This method is called automatically by platform renders to override the scheduling mechanism, e.g. using requestAnimationFrame. It's not necessary to call this method directly.
	 * - Only one callback is used at a time.
	 */
	setScheduleCallback(callback?: () => void) {
		this._onSchedule = callback;
		clearTimeout(this._timer);
		this._timer = undefined;
	}

	private _scheduleTimer() {
		this._timer = setTimeout(() => {
			this._timer = undefined;
			this.run();
		}, this._delay);
	}
}
