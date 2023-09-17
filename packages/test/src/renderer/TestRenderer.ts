import { AsyncTaskQueue, Observer, RenderContext, app } from "desk-frame";
import { val2str } from "../log.js";
import { makeObserver } from "./observers.js";
import { OutputAssertion, OutputSelectFilter } from "../app/OutputAssertion.js";
import type { TestContextOptions } from "../app/TestContext.js";
import { TestOutputElement } from "../app/TestOutputElement.js";
import { clearStyles } from "./TestBaseObserver.js";

/** Max run time for scheduled render functions */
const MAX_SCHED_RUNTIME = 30;

/**
 * A class that represents an in-memory application render context
 * - This class behaves mostly like a 'real' renderer, but only keeps rendered elements in memory. The elements can be queried and validated using e.g. {@link TestCase.expectOutputAsync()}.
 */
export class TestRenderer extends RenderContext {
	/**
	 * Creates a new render context instance, used by {@link useTestContext()}
	 * @hideconstructor
	 */
	constructor(options: TestContextOptions) {
		super();
		this._queue = app.scheduler.createQueue(
			"TestRenderer",
			true,
			(queueOptions) => {
				queueOptions.maxSyncTime = MAX_SCHED_RUNTIME;
				queueOptions.throttleDelay = options.renderFrequency;
			},
		);
	}

	/** Schedules the provided callback in the rendering queue */
	schedule(f: () => void, lowPriority?: boolean) {
		this._queue.add(f, lowPriority ? 1 : 0);
	}

	/** Returns a global render callback, which adds new output to the root element */
	getRenderCallback() {
		let lastOutput: RenderContext.Output | undefined;
		let self = this;
		return <RenderContext.RenderCallback>(
			function callback(output, afterRender) {
				self.schedule(() => {
					if (lastOutput && lastOutput !== output && lastOutput.element) {
						(lastOutput.element as TestOutputElement).remove();
					}
					if (output && output.element) {
						let elt = output.element as TestOutputElement;
						if (!self._root.content.includes(elt)) {
							self._root.content.push(elt);
							elt.parent = self._root;
						}
						lastOutput = output;
					}
					if (afterRender) afterRender(output);
				});
				return callback;
			}
		);
	}

	/**
	 * Attempts to set input focus to the specified element in the background
	 * - This method is used by the UI component renderer. To acquire input focus, use the {@link UIComponent.requestFocus()} method instead of calling this method directly.
	 * - Use a poll function or {@link TestCase.expectOutputAsync()} to wait until the element has received input focus.
	 * @param element The output element to focus
	 */
	tryFocusElement(element?: TestOutputElement) {
		if (!element) return;
		this._elementToFocus = element;
		let loop = 0;
		const tryFocus = () => {
			if (!element.hasFocus() && element === this._elementToFocus) {
				element.focus();
				if (loop++ < 2) {
					setTimeout(() => this.schedule(tryFocus, true), 1);
				}
			}
		};
		this.schedule(tryFocus, true);
	}
	private _elementToFocus?: TestOutputElement;

	/** Transforms or animates the provided output element (not supported in test renderer) */
	transform(_output: RenderContext.Output) {}

	/** Attaches a renderer to the the provided UI component (called internally) */
	createObserver<T extends RenderContext.Renderable>(
		target: T,
	): Observer<T> | undefined {
		return makeObserver(target);
	}

	/**
	 * Clears all existing output
	 * @note To re-initialize the application before a test, use the {@link useTestContext()} function.
	 */
	clear() {
		this._root.content.splice(0);
		clearStyles();
		return this;
	}

	/** Re-mounts mounted content (not supported in test renderer) */
	remount() {
		return this;
	}

	/** Returns true if any output is currently rendered at all */
	hasOutput() {
		return !!this._root.content.length;
	}

	/**
	 * Creates an assertion for the currently rendered output with the provided (optional) selection filter(s)
	 * - This method can be used to validate the current (test) output, and find the subset of output elements that match the given filter(s). Any element in the current output may be matched, including container content; but not content _within_ a matching container (i.e. only the highest-level elements that match a selection filter).
	 * - If no elements were matched at all, the return value is an {@link OutputAssertion} for an empty set of elements. Use the {@link OutputAssertion.toBeRendered()} method to validate that the result set is **not** empty.
	 * - To _wait_ for output to match a set of selection filters, use the {@link expectOutputAsync()} method instead. Note that this is often necessary, since content is rendered asynchronously.
	 * @param select A list of filters to find matching output elements. The first filter is applied, then the second one on all _content_ of matching elements, and so on. Note that multiple elements may be found, which may not be part of the same container.
	 * @returns An {@link OutputAssertion} instance for the matched element(s), or an empty set if no elements matched at all.
	 */
	expectOutput(...select: OutputSelectFilter[]) {
		let result = new OutputAssertion(this._root.content, select.shift());
		for (let c of select) result = result.containing(c);
		return result;
	}

	/**
	 * Waits for output to be rendered, that matches the provided selection filter(s)
	 * - To avoid casting {@link app} to get to the {@link TestRenderer} instance, use the {@link TestCase.expectOutputAsync()} method instead.
	 * @note This method is asynchronous, and **must** be `await`-ed in a test function.
	 *
	 * @summary
	 * This method regularly polls all rendered output, and attempts to match the given filter(s). As soon as one or more elements match **and** no further rendering is scheduled to take place, the resulting promise is resolved.
	 * 
	 * This method can be used to validate new output, and find the subset of output elements that match the given filter(s). Any element in the current output may be matched, including container content; but not content _within_ a matching container (i.e. only the highest-level elements that match a selection filter).

	 * If the specified timeout is reached, the promise is rejected.
	 *
	 * @param timeout The number of milliseconds to wait for matching output to be rendered
	 * @param select A list of filters to find matching output elements. The first filter is applied, then the second one on all _content_ of matching elements, and so on. Note that multiple elements may be found, which may not be part of the same container.
	 * @returns A promise for an {@link OutputAssertion} instance for the matched element(s). The promise is rejected if a timeout occurs.
	 *
	 * @example
	 * describe("My scope", () => {
	 *   test("Expect a button", async (t) => {
	 *     let app = useTestContext();
	 *     // ... render a view
	 *     // now wait for a Confirm button:
	 *     await app.renderer.expectOutputAsync(
	 *       100,
	 *       { type: "button", text: "Confirm" }
	 *     );
	 * });
	 */
	async expectOutputAsync(timeout: number, ...select: OutputSelectFilter[]) {
		let startT = Date.now();
		return new Promise<OutputAssertion>((resolve, reject) => {
			let poll = () => {
				// schedule render callback as low priority to land *after* rendering
				this._queue.add(() => {
					if (this._queue.count <= 1) {
						// resolve with assertion if matches
						let assertion = this.expectOutput(...select);
						if (assertion.elements.length) return resolve(assertion);
					}
					if (timeout && Date.now() > startT + timeout) {
						// reject because of timeout
						return reject(
							new Error(
								"expectOutputAsync timeout: " +
									select.map((s) => val2str(s)).join(" "),
							),
						);
					}
					poll();
				}, 2);
			};
			poll();
		});
	}

	/** Returns an object representation of (selected) output */
	getOutputDump(...select: OutputSelectFilter[]) {
		let elements = this.expectOutput(...select).elements;
		return elements.map((elt) => elt.toJSON());
	}

	private _queue: AsyncTaskQueue;
	private _root = new TestOutputElement("root");
}
