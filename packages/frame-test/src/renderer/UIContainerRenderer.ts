import {
	RenderContext,
	UICell,
	UIColumn,
	UIContainer,
	UIRow,
	UIScrollContainer,
	UIStyle,
	View,
	app,
} from "@desk-framework/frame-core";
import { TestOutputElement } from "../app/TestOutputElement.js";
import { TestBaseObserver, applyElementStyle } from "./TestBaseObserver.js";

/** @internal */
export class UIContainerRenderer<
	TContainer extends UIContainer,
> extends TestBaseObserver<TContainer> {
	constructor(observed: TContainer) {
		super(observed);
		this.observeProperties("layout", "padding");
		if (observed instanceof UIRow) {
			this.observeProperties("height" as any, "align" as any);
		}
		if (observed instanceof UIColumn) {
			this.observeProperties("width" as any, "align" as any);
		}

		// observe content changes
		observed.content.listen((e) => {
			if (this.element && e.source === observed.content) {
				this.scheduleUpdate(this.element);
			}
		});

		// observe unlink, to stop content updater right away
		observed.listen({
			unlinked: () => {
				if (this.contentUpdater) this.contentUpdater.stop();
				this.contentUpdater = undefined;
			},
		});
	}

	protected override propertyChange(property: string, value: any) {
		if (!this.element) return;
		switch (property) {
			case "layout":
			case "padding":
			case "align": // for rows and columns
			case "height": // for rows
			case "width": // for columns
				this.scheduleUpdate(undefined, this.element);
				return;
		}
		super.propertyChange(property, value);
	}

	getOutput() {
		let type: TestOutputElement.TypeString;
		if (this.observed.accessibleRole === "form") type = "form";
		else if (this.observed instanceof UICell) type = "cell";
		else if (this.observed instanceof UIRow) type = "row";
		else if (this.observed instanceof UIColumn) type = "column";
		else type = "container";
		let elt = new TestOutputElement(type);
		let output = new RenderContext.Output(this.observed, elt);
		elt.output = output;
		return output;
	}

	override update(element: TestOutputElement) {
		if (this.contentUpdater) {
			// force re-rendering of all content, when render()
			// is called explicitly on container
			this.contentUpdater.stop();
			this.contentUpdater = undefined;
		}
		super.update(element);
	}

	updateContent(element: TestOutputElement) {
		let container = this.observed;
		if (!this.contentUpdater) {
			this.contentUpdater = new ContentUpdater(
				container,
				element,
			).setAsyncRendering(container.asyncContentRendering);
			this.contentUpdater.awaitUpdateAsync();
		}

		// NOTE: spacing/separators are ignored here because they can't be tested;
		this.contentUpdater.update(container.content);
	}

	contentUpdater?: ContentUpdater;

	override updateStyle(
		element: TestOutputElement,
		BaseStyle?: UIStyle.Type<any>,
		styles?: any[],
	) {
		let container = this.observed;
		let layout = container.layout;
		if (container instanceof UIRow) {
			styles = [{ height: container.height, padding: container.padding }];
			if (container.align) {
				layout = { ...layout, distribution: container.align };
			}
		} else if (container instanceof UIColumn) {
			styles = [{ width: container.width, padding: container.padding }];
			if (container.align) {
				layout = { ...layout, gravity: container.align };
			}
		} else if (container instanceof UIScrollContainer) {
			styles = [{ padding: container.padding }];
		}

		// apply styles
		element.styleClass = BaseStyle;
		applyElementStyle(element, styles, container.position, layout);
	}
}

/** @internal Asynchronous content updater, for a particular output element */
export class ContentUpdater {
	constructor(container: UIContainer, element: TestOutputElement) {
		this.container = container;
		this.element = element;
	}

	/** The container itself */
	readonly container: UIContainer;

	/** The element for which contents need to be updated */
	readonly element: TestOutputElement;

	/** Current list of content items */
	content: View[] = [];

	/** Set async rendering flag; when enabled, all content is rendered asynchronously */
	setAsyncRendering(async?: boolean) {
		this._async = async;
		return this;
	}

	/** Stop updating content asynchronously */
	stop() {
		this._stopped = true;
		this._output = new Map();
		this.content = [];
		return this;
	}

	/** Update the output element with output from given list of content views (or current) */
	update(content: Iterable<View> = this.content) {
		// resolve the current update promise, or create a resolved promise right away
		if (this._updateResolve) this._updateResolve();
		else this._updateP = Promise.resolve();

		if (!this._stopped) {
			// NOTE: this is simpler in the test renderer than
			// in the web renderer, because we don't need to
			// worry about updating in-place.

			// go through all content items and get their output
			let outputs: Array<RenderContext.Output> = [];
			let elements: TestOutputElement[] = [];
			for (let it of content) {
				let output = this.getItemOutput(it);
				if (output && output.element instanceof TestOutputElement) {
					outputs.push(output);
					elements.push(output.element);
					output.element.parent = this.element;
				}
			}

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

	/** Get the current output for given content view, or render it if needed; returns the output, or undefined if the output is still being rendered. */
	getItemOutput(item: View) {
		if (!this._output.has(item)) {
			// set output to undefined first, to avoid rendering again
			this._output.set(item, undefined);
			let isSync = true;
			let lastOutput: RenderContext.Output<TestOutputElement> | undefined;

			// define rendering callback
			const callback: RenderContext.RenderCallback<TestOutputElement> = (
				output,
				afterRender,
			) => {
				const scheduleAfter =
					afterRender &&
					(() => {
						if (afterRender && app.renderer) app.renderer.schedule(afterRender);
					});
				if (this._stopped) return callback;
				if (output && lastOutput !== output) {
					// new output received: detach from old parent if any
					if (output.detach) output.detach();
					output.detach = () => {
						if (this._output.get(item) === output) {
							this._output.set(item, undefined);
						}
					};
				}

				// set output for later reference, return if still synchronous
				this._output.set(item, output);
				if (isSync) {
					lastOutput = output;
					scheduleAfter && scheduleAfter();
					return callback;
				}

				// async update: delete or replace previous element
				let lastElt = lastOutput && (lastOutput.element as TestOutputElement);
				lastOutput = output;
				if (!output || !output.element) {
					// no output... delete last element now
					let content = this.element.content;
					if (lastElt) {
						for (let i = content.length - 1; i >= 0; i--) {
							if (content[i] === lastElt) {
								content.splice(i, 1);
								lastElt.parent = undefined;
								break;
							}
						}
					}
					scheduleAfter && scheduleAfter();
				} else if (lastElt && lastElt.parent === this.element) {
					// can replace...
					if (lastElt !== output.element) {
						let content = this.element.content;
						let i;
						for (i = content.length - 1; i >= 0; i--) {
							if (content[i] === lastElt) {
								content[i] = output.element;
								lastElt.parent = undefined;
								output.element.parent = this.element;
								break;
							}
						}
					}
					scheduleAfter && scheduleAfter();
				} else {
					// ...otherwise wait for full async update
					this.awaitUpdateAsync().then(() => scheduleAfter && scheduleAfter());
				}
				return callback;
			};

			// invoke render method now or async
			const doRender = () => {
				if (this._stopped) return;
				try {
					item.render(callback as any);
				} catch (err) {
					app.log.error(err);
				}
			};
			this._async && app.renderer
				? app.renderer.schedule(() => doRender(), true)
				: doRender();

			// set placeholder output if needed, to reduce diffing later
			isSync = false;
			if (!lastOutput) {
				let placeholderElt = new TestOutputElement("placeholder");
				let output = new RenderContext.Output<TestOutputElement>(
					item,
					placeholderElt,
				);
				lastOutput = output;
				this._output.set(item, output);
			}
		}
		return this._output.get(item);
	}

	/** Returns a promise that's resolved after the current update ends; OR schedules a new update and returns a new promise */
	async awaitUpdateAsync() {
		if (this._updateP) return this._updateP;
		if (this._async) {
			await new Promise((r) => setTimeout(r, 1));
		}
		if (!this._updateP) {
			this._updateP = new Promise((r) => {
				this._updateResolve = r;
			});
			if (app.renderer) app.renderer.schedule(() => this.update());
			else this.update();
		}
		return this._updateP;
	}

	private _stopped?: boolean;
	private _async?: boolean;
	private _updateP?: Promise<void>;
	private _updateResolve?: () => void;
	private _output = new Map<View, RenderContext.Output | undefined>();
}
