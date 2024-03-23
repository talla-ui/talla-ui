---
title: Task scheduling
folder: topics
abstract: Use task queues to manage lists of prioritized asynchronous tasks.
---

# Task scheduling

> {@include abstract}

## Overview {#overview}

Task scheduling is a common requirement in many applications, whether to control or throttle a long series of callbacks, or to manage a group of asynchronous parallel tasks. Desk provides a simple way to manage such tasks, with the ability to start, pause, resume, and cancel tasks as needed, using the {@link AsyncTaskQueue} object.

- {@link AsyncTaskQueue +}

## Creating a task queue {#creating}

Task queues can be created either using the {@link Activity} class, or using the global {@link Scheduler} object that's part of the app context, available as `app.scheduler`.

**Creating a task queue using an activity** — A task queue that's created using an activity is automatically linked to the activity's lifecycle: it starts when the activity is activated, and pauses when the activity is deactivated. This is useful for managing tasks that are specific to a particular part of the application.

Use the {@link Activity.createActiveTaskQueue()} method to create such a task queue, from the activity constructor or as a property.

- {@link Activity.createActiveTaskQueue}

```ts
class MyActivity extends Activity {
	// ...

	private _queue = this.createActiveTaskQueue();
}
```

For more information, refer to the following topic:

- {@link activities}

**Creating a task queue using the global scheduler** — A task queue that's created using the global scheduler _must_ have a unique name (or symbol) that identifies it. The scheduler keeps track of all task queues created, and can be used to replace queues, or stop all of them at the same time.

Use the {@link Scheduler.createQueue()} method to create a task queue using the global scheduler.

- {@link Scheduler +}
- {@link Scheduler.createQueue}

```ts
const apiFetchQueue = app.scheduler.createQueue(
	"API.fetch",
	true,
	(options) => {
		options.parallel = 3;
		options.taskTimeout = 120_000;
	},
);
```

## Controlling a task queue {#controlling}

Once a task queue has been created, tasks will start running as soon as they're added to the queue. You can control the queue using the following methods:

- {@link AsyncTaskQueue.pause}
- {@link AsyncTaskQueue.resume}
- {@link AsyncTaskQueue.stop}

> **Note:** Currently running (already-called) tasks can't be stopped, but any tasks that haven’t been invoked will no longer run on a stopped queue. Asynchronous tasks that have already been started should check the `cancelled` property of the AsyncTaskQueue.Task function argument if needed (see below).

## Adding tasks to a queue {#adding}

To add a task to a queue, use the {@link AsyncTaskQueue.add()} method with a function argument. The function will be called when the task is started (asynchronously), and if the function returns a promise, the promise will be awaited before the task is considered complete.

```ts
// run two tasks after each other:
let queue = app.scheduler.createQueue("myQueue");
queue.add(async () => {
	await new Promise((r) => setTimeout(r, 1000));
	console.log("Task 1 complete");
});
queue.add(async () => {
	await new Promise((r) => setTimeout(r, 1000));
	console.log("Task 2 complete");
});
```

Alternatively, use the {@link AsyncTaskQueue.addOrReplace()} method to add a task to the queue, replacing any existing task that's currently in the queue with the same 'handle' — a name or symbol that uniquely identifies the task. You can use this to throttle or debounce tasks.

```ts
let queue = app.scheduler.createQueue("myQueue", true, (options) => {
	options.throttleDelay = 1000;
});

// e.g. repeatedly in an event handler:
queue.addOrReplace("throttled", async () => {
	// ... fetch or update some data
	// (at most every second)
});
```

If your task may run (asynchronously) for a long time, you should use the task function argument to check if the task has been cancelled, i.e. the queue has been stopped.

```ts
queue.add(async (task) => {
	// ... do some work, await some promises

	// check if we should continue:
	if (task.cancelled) return;

	// ... do some more work
});
```

## Waiting for tasks to complete {#waiting}

**Checking the current count** — After tasks have been added and the queue has been started, you can use the read-only `count` property to check the number of pending tasks in the queue (including those that are currently being awaited).

```ts
// check if the queue is empty
if (queue.count === 0) {
	// ... do something
}
```

**Waiting asynchronously** — Instead of checking the `count` property, you can also wait for the task count to fall below a certain threshold using the {@link AsyncTaskQueue.waitAsync waitAsync()} method. By default, this method returns a promise that's resolved only after the queue is empty, but you can also pass a threshold count to resolve the promise earlier. However, if the queue is stopped, the promise will be rejected with a {@link AsyncTaskQueue.QueueStoppedError QueueStoppedError}.

This may be useful e.g. when loading paged data, to ensure that the next page is only loaded when the previous page has been processed.

- {@link AsyncTaskQueue.waitAsync}

```ts
// wait for the queue to have 2 or fewer tasks
await queue.waitAsync(2);
```

**Checking for errors** — Tasks queues can be configured to keep track of errors that occur in tasks, rather than letting the errors be handled by the global error handler. In this case, all errors are collected in the queue's `errors` property.

```ts
let queue = app.scheduler.createQueue("myQueue", true, (options) => {
	options.catchErrors = true;
});
// ...

await queue.waitAsync();
if (queue.errors.length > 0) {
	// ... handle errors (e.g. retry or show a message)
}
```
