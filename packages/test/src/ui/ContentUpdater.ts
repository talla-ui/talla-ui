import { app, RenderContext, UIContainer } from "desk-frame";
import { TestOutputElement } from "../app/TestOutputElement.js";

/** Alias for TestOutputElement to make it easier to move this to a real renderer with a specific output element type */
type OutElement = TestOutputElement;

/** @internal Asynchronous content updater, for a particular output element */
export class ContentUpdater {
	constructor(container: UIContainer, element: OutElement) {
		this.container = container;
		this.element = element;
	}

	/** Set async rendering flag; when enabled, all content is rendered asynchronously */
	setAsyncRendering(async?: boolean) {
		this._async = async;
		return this;
	}

	/** Stop updating content asynchronously */
	stop() {
		this._stopped = true;
		return this;
	}

	/** The container component for which content is being updated */
	readonly container: UIContainer;

	/** The element for which contents need to be updated */
	readonly element: OutElement;

	/** Current list of content items */
	content: RenderContext.Renderable[] = [];

	/** Update the output element with output from given list of content items (or current) */
	update(content: Iterable<RenderContext.Renderable> = this.content) {
		// resolve the current update promise, or create a resolved promise right away
		if (this._updateResolve) this._updateResolve();
		else this._updateP = Promise.resolve();

		if (!this._stopped) {
			// go through all content items and get their output
			let outputs: Array<RenderContext.Output> = [];
			let elements: OutElement[] = [];
			for (let it of content) {
				let output = this.getItemOutput(it);
				if (output && output.element instanceof TestOutputElement) {
					outputs.push(output);
					elements.push(output.element);
					output.element.parent = this.element;
				}
			}

			// emit renderer event to allow e.g. animated list content
			this._emitRendering(outputs);

			// unset parent reference for removed elements
			for (let old of this.element.content) {
				if (old.parent === this.element && !elements.includes(old)) {
					old.parent = undefined;
				}
			}

			// update element content
			this.content = [...content];
			this.element.content.splice(0);
			this.element.content.push(...elements);
		}

		// remove (resolved) promises, so that
		// new calls to `awaitUpdateAsync()` will schedule an update
		this._updateP = undefined;
		this._updateResolve = undefined;
	}

	/** Get the current output for given content item, or render it if needed; returns the output, or undefined if the output is still being rendered. */
	getItemOutput(item: RenderContext.Renderable) {
		if (!this._output.has(item)) {
			// set output to undefined first, to avoid rendering again
			this._output.set(item, undefined);

			// define rendering callback, which updates the output map
			// and possibly schedules an update
			const callback: RenderContext.RenderCallback = (output, afterRender) => {
				if (this._stopped) return callback;
				let lastOutput = this._output.get(item);
				if (output && lastOutput !== output) {
					// new output received: detach from old parent if any
					if (output.detach) output.detach();
					output.detach = () => {
						if (this._output.get(item) === output) {
							this._output.set(item, undefined);
						}
					};
				}
				this._output.set(item, output);
				this.awaitUpdateAsync()
					.then(() => afterRender && afterRender(output))
					.catch((err) => app.log.error(err));
				return callback;
			};

			// invoke render method now or async
			const doRender = () => {
				try {
					item.render(callback);
				} catch (err) {
					app.log.error(err);
				}
			};
			this._async ? setTimeout(doRender, 1) : doRender();
		}
		return this._output.get(item);
	}

	/** Returns a promise that's resolved after the current update ends; OR schedules a new update and returns a new promise */
	awaitUpdateAsync() {
		if (!this._updateP) {
			this._updateP = new Promise((r) => {
				this._updateResolve = r;
			});
			if (app.renderer) app.renderer.schedule(() => this.update(), true);
			else setTimeout(() => this.update(), 1);
		}
		return this._updateP;
	}

	/** Emit ContentRendering event on container, when deleting or replacing an element */
	private _emitRendering(output?: Array<RenderContext.Output | undefined>) {
		let event = new RenderContext.RendererEvent(
			"ContentRendering",
			this.container,
			{
				output: output || this.content.map((c) => this._output.get(c)),
			},
		);
		this.container.emit(event);
	}

	private _stopped?: boolean;
	private _async?: boolean;
	private _updateP?: Promise<void>;
	private _updateResolve?: () => void;
	private _output = new Map<
		RenderContext.Renderable,
		RenderContext.Output | undefined
	>();
}
