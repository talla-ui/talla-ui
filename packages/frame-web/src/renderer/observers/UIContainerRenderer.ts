import {
	app,
	RenderContext,
	ui,
	UIColumn,
	UIContainer,
	UIRow,
	UIScrollContainer,
	UIStyle,
	View,
} from "@desk-framework/frame-core";
import {
	CLASS_CELL,
	CLASS_COLUMN,
	CLASS_ROW,
	CLASS_SCROLL,
	CLASS_SEPARATOR_LINE,
	CLASS_SEPARATOR_LINE_VERT,
	CLASS_SEPARATOR_SPACER,
} from "../../style/defaults/css.js";
import { applyStyles, getCSSLength } from "../../style/DOMStyle.js";
import { BaseObserver } from "./BaseObserver.js";

/** @internal */
export class UIContainerRenderer<
	TContainer extends UIContainer,
> extends BaseObserver<TContainer> {
	constructor(observed: TContainer) {
		super(observed);
		this.observeProperties("layout");
		if (observed instanceof UIRow) {
			this.observeProperties("height" as any, "align" as any, "spacing" as any);
		}
		if (observed instanceof UIColumn) {
			this.observeProperties(
				"width" as any,
				"align" as any,
				"distribute" as any,
				"spacing" as any,
			);
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
			case "spacing":
				this.updateSeparator();
				return;
			case "layout":
			case "align":
			case "height":
			case "width":
			case "distribute":
				this.scheduleUpdate(undefined, this.element);
				return;
		}
		super.propertyChange(property, value);
	}

	getOutput() {
		let isForm = this.observed.accessibleRole === "form";
		let elt = document.createElement(isForm ? "form" : "container");
		let output = new RenderContext.Output(this.observed, elt);

		// add form submit handler, if needed
		if (isForm) {
			elt.addEventListener("submit", (e) => {
				e.preventDefault();
				if (this.observed) this.observed.emit("Submit", { event: e });
			});
		}
		return output;
	}

	override update(element: HTMLElement) {
		if (this.contentUpdater) {
			// force re-rendering of all content, when render()
			// is called explicitly on container
			this.contentUpdater.stop();
			this.contentUpdater = undefined;
			this.lastSeparator = undefined;
		}
		super.update(element);
	}

	updateContent(element: HTMLElement) {
		let container = this.observed;
		if (!this.contentUpdater) {
			this.contentUpdater = new ContentUpdater(
				container,
				element,
			).setAsyncRendering(container.asyncContentRendering);
			this.updateSeparator();
		}
		this.contentUpdater.update(container.content);
	}

	contentUpdater?: ContentUpdater;

	override updateStyle(
		element: HTMLElement,
		BaseStyle?: UIStyle.Type<any>,
		styles?: any[],
	) {
		// set styles based on type of container
		let container = this.observed;
		let systemName: string;
		let layout = container.layout;
		if (container instanceof UIRow) {
			systemName = CLASS_ROW;
			styles = [{ height: container.height }];
			if (container.align || container.gravity) {
				layout = Object.assign(
					{},
					layout,
					container.align ? { distribution: container.align } : undefined,
					container.gravity ? { gravity: container.gravity } : undefined,
				);
			}
		} else if (container instanceof UIColumn) {
			systemName = CLASS_COLUMN;
			styles = [{ width: container.width }];
			if (container.align || container.distribute) {
				layout = Object.assign(
					{},
					layout,
					container.align ? { gravity: container.align } : undefined,
					container.distribute
						? { distribution: container.distribute }
						: undefined,
				);
			}
		} else if (container instanceof UIScrollContainer) {
			systemName = CLASS_SCROLL;
		} else {
			// (use styles passed in by cell renderer)
			systemName = CLASS_CELL;
		}

		applyStyles(
			container,
			element,
			BaseStyle,
			systemName,
			false,
			true,
			styles,
			container.position,
			layout,
		);
		this.updateSeparator();
	}

	updateSeparator() {
		if (this.observed && this.contentUpdater) {
			// Note: 'vertical' is a bit confusing here,
			// because it's the separator orientation
			// not the container axis (horizontal layout
			// needs vertical lines, and vice versa)
			let layout = this.observed.layout;
			let horzAxis =
				layout?.axis === "horizontal"
					? true
					: layout?.axis === "vertical"
					? false
					: this.observed instanceof UIRow;
			let options = layout?.separator;
			if (!options && (this.observed as UIRow).spacing) {
				let space = (this.observed as UIRow).spacing;
				options =
					this.lastSeparator &&
					this.lastSeparator.space === space &&
					this.lastSeparator.vertical === horzAxis
						? this.lastSeparator
						: { space, vertical: horzAxis };
			}
			if (this.lastSeparator !== options) {
				this.lastSeparator = options;
				this.contentUpdater.setSeparator(options, horzAxis);
			}
		}
	}
	lastSeparator?: UIContainer.SeparatorOptions;
}

/** @internal Asynchronous container content updater */
export class ContentUpdater {
	constructor(container: UIContainer, element: HTMLElement) {
		this.container = container;
		this.element = element;
	}

	/** The container itself */
	readonly container: UIContainer;

	/** The element for which contents need to be updated */
	readonly element: HTMLElement;

	/** Current list of content items */
	content: View[] = [];

	/** Set async rendering flag; when enabled, all content is rendered asynchronously */
	setAsyncRendering(async?: boolean) {
		this._async = async;
		return this;
	}

	/** Set separator details; possibly update rendered separators */
	setSeparator(
		options?: UIContainer.SeparatorOptions,
		defaultVertical?: boolean,
	) {
		let sep: HTMLElement | undefined;
		let vertical = (options && options.vertical) ?? defaultVertical;
		if (options && options.lineThickness) {
			let size = getCSSLength(options.lineThickness, "");
			let margin = getCSSLength(options.lineMargin, "");
			sep = document.createElement("hr");
			sep.className =
				CLASS_SEPARATOR_LINE +
				(vertical ? " " + CLASS_SEPARATOR_LINE_VERT : "");
			sep.style.borderWidth = size;
			sep.style.margin = margin
				? vertical
					? "0 " + margin
					: margin + " 0"
				: "";
			sep.style.borderColor = String(options.lineColor || ui.color.SEPARATOR);
		} else if (options && options.space) {
			let size = getCSSLength(options && options.space, "0");
			sep = document.createElement("spacer" as string);
			sep.className = CLASS_SEPARATOR_SPACER;
			if (vertical) {
				sep.style.width = size;
			} else {
				sep.style.height = size;
			}
		}
		this._sepTemplate = sep;

		// update all separators now
		if (sep && this._separators.size) {
			let oldSeparators = this._separators;
			this._separators = new Map();
			for (let [content, sep] of oldSeparators.entries()) {
				let newSep = this._getSeparatorFor(content)!;
				this.element.replaceChild(newSep, sep);
			}
		} else if (this.content.length) {
			this.element.innerHTML = "";
			this.awaitUpdateAsync();
		}
		return this;
	}

	/** Stop updating content asynchronously */
	stop() {
		this._stopped = true;
		this._separators = new Map();
		this._output = new Map();
		this.content = [];
		return this;
	}

	/** Update the output element with output from given list of content views (or current) */
	update(content: Iterable<View> = this.content) {
		let element = this.element;

		// resolve the current update promise, or create a resolved promise right away
		if (this._updateResolve) this._updateResolve();
		else this._updateP = Promise.resolve();

		if (!this._stopped) {
			// go through all content items and get their output
			let output: Array<RenderContext.Output<Node> | undefined> = [];
			let contentSet = new Set<View>();
			for (let it of content) {
				contentSet.add(it);
				output.push(this.getItemOutput(it));
			}

			// STEP 1: find deleted content and delete elements
			let hasSeparators = this._sepTemplate;
			for (let it of this.content) {
				if (!contentSet.has(it)) {
					let out = this._output.get(it);
					if (out) {
						let elt = out.element as Node;
						if (elt && elt.parentNode === element) {
							if (!elt.previousSibling && hasSeparators && elt.nextSibling) {
								// if first element, remove separator AFTER
								element.removeChild(elt.nextSibling);
							}
							// remove element itself
							element.removeChild(elt);
						}
						this._output.delete(it);
					}
					let sep = hasSeparators && this._getSeparatorFor(it);
					if (sep && sep.parentNode === element) {
						// delete separator (before) for this element, if any
						element.removeChild(sep);
					}
					this._separators.delete(it);
				}
			}
			let newContent = (this.content = [...content]);

			// STEP 2: insert/move element content (and separators)
			let cur = element.firstChild;
			let hasContent = false;
			for (let i = 0, len = newContent.length; i < len; i++) {
				let elt = output[i]?.element;
				if (!elt || elt.nodeType === Node.COMMENT_NODE) continue;

				// expect a separator in this position first (if i > 0)
				if (hasContent && hasSeparators) {
					let sep = this._getSeparatorFor(newContent[i]!)!;
					if (cur !== sep) {
						element.insertBefore(sep, cur);
					} else {
						cur = cur && cur.nextSibling;
					}
				}
				hasContent = true;

				// insert correct element next
				if (cur !== elt) {
					element.insertBefore(elt, cur);
				} else {
					cur = cur && cur.nextSibling;
				}
			}

			// STEP 3: remove all leftover elements
			if (cur) {
				while (cur.nextSibling) element.removeChild(cur.nextSibling);
				element.removeChild(cur!);
			}
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
			let lastOutput: RenderContext.Output | undefined;

			// define rendering callback
			const callback: RenderContext.RenderCallback = (output, afterRender) => {
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
				this._output.set(item, output as any);
				if (isSync) {
					lastOutput = output;
					scheduleAfter && scheduleAfter();
					return callback;
				}

				// async update: delete or replace previous element
				let lastElt = lastOutput && (lastOutput.element as HTMLElement);
				lastOutput = output;
				if (!output || !output.element) {
					// no output... delete last element (and separator) now
					let sep = this._separators.get(item);
					if (sep && sep.parentNode === this.element) {
						this.element.removeChild(sep);
					}
					if (lastElt && lastElt.parentNode === this.element) {
						this.element.removeChild(lastElt);
					}
					scheduleAfter && scheduleAfter();
				} else if (lastElt && lastElt.parentNode === this.element) {
					// can replace... (and add/move separator if needed)
					if (lastElt.previousSibling) {
						let sep = this._getSeparatorFor(item);
						if (sep) this.element.insertBefore(sep, lastElt);
					}
					this.element.replaceChild(output!.element as any, lastElt);
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
					item.render(callback);
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
				let placeholderElt = document.createComment("?");
				let output = new RenderContext.Output<Node>(item, placeholderElt);
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

	/** Returns a separator HTML element (if needed) for given content view; if an element already exists it's used, otherwise a new element is created */
	private _getSeparatorFor(content: View) {
		if (this._sepTemplate) {
			let sep = this._separators.get(content);
			if (!sep) {
				sep = this._sepTemplate.cloneNode() as HTMLElement;
				this._separators.set(content, sep);
			}
			return sep;
		}
	}

	private _stopped?: boolean;
	private _async?: boolean;
	private _updateP?: Promise<void>;
	private _updateResolve?: () => void;
	private _output = new Map<View, RenderContext.Output<Node> | undefined>();
	private _sepTemplate?: HTMLElement;
	private _separators = new Map<View, HTMLElement>();
}
