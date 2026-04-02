import {
	app,
	ObservableEvent,
	RenderContext,
	UI,
	UIContainer,
	UIElement,
	UIRow,
	UIScrollView,
	View,
	ViewEvent,
} from "@talla-ui/core";
import { isMarkedForRemoval } from "../awaitRemove.js";
import {
	CLASS_HORZ,
	CLASS_SCROLL,
	CLASS_SEPARATOR_LINE,
	CLASS_SEPARATOR_LINE_VERT,
	CLASS_SEPARATOR_SPACER,
	CLASS_VERT,
} from "../defaults/css.js";
import { applyStyles, colorToCSS, getCSSLength } from "../DOMStyle.js";
import { BaseObserver } from "./BaseObserver.js";

/** @internal */
export class UIContainerRenderer<
	TContainer extends UIContainer,
> extends BaseObserver<TContainer> {
	constructor(observed: TContainer) {
		super(observed);
		this.observeProperties(
			"layout",
			"allowFocus",
			"allowKeyboardFocus",
			"trackHover",
			"reverse",
			"gap",
		);

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
			case "gap":
				return this.updateSeparator();
			case "reverse":
				return this.scheduleUpdate(this.element);
		}
		super.propertyChange(property, value);
	}

	getOutput() {
		let container = this.observed;
		let isForm = container.accessibleRole === "form";
		let elt = document.createElement(isForm ? "form" : "container");
		let output = new RenderContext.Output(container, elt);

		// add form submit handler, if needed
		if (isForm) {
			elt.addEventListener("submit", (e) => {
				e.preventDefault();
				if (this.observed) this.observed.emit("Submit", { event: e });
			});
		}

		// make (keyboard) focusable, if needed
		if (container.allowKeyboardFocus) elt.tabIndex = 0;
		else if (container.allowFocus) elt.tabIndex = -1;

		// add mouse handlers for hover tracking (events not propagated)
		if (container.trackHover) {
			elt.addEventListener("mouseenter", (e) => {
				this._isHovered = true;
				let event = new ObservableEvent(
					"MouseEnter",
					container,
					{ event: e },
					undefined,
					true,
				);
				if (this.observed === container) container.emit(event);
			});
			elt.addEventListener("mouseleave", (e) => {
				this._isHovered = false;
				let event = new ObservableEvent(
					"MouseLeave",
					container,
					{ event: e },
					undefined,
					true,
				);
				if (this.observed === container) container.emit(event);
			});
		}
		return output;
	}

	isHovered(): boolean {
		return this._isHovered;
	}

	private _isHovered = false;

	override update(element: HTMLElement) {
		if (this.contentUpdater) {
			// force re-rendering of all content, when render()
			// is called explicitly on container
			this.contentUpdater.stop();
			this.contentUpdater = undefined;
		}
		super.update(element);
	}

	updateContent(element: HTMLElement) {
		let container = this.observed;
		if (!this.contentUpdater) {
			this.contentUpdater = new ContentUpdater(container, element);
			this.updateSeparator();
		}
		this.contentUpdater.update(container.content, container.reverse);

		// reset tabindex if previously focused element is no longer in content
		if (
			container.allowKeyboardFocus &&
			this.lastFocused &&
			!container.content.includes(this.lastFocused)
		) {
			if (this.element) this.element.tabIndex = 0;
			this.lastFocused = undefined;
		}
	}

	contentUpdater?: ContentUpdater;

	override updateStyle(element: HTMLElement) {
		// set styles based on type of container
		let container = this.observed;
		let systemClass: string | undefined;
		let layout = container.layout;
		if (container instanceof UIScrollView) {
			systemClass = CLASS_SCROLL;
		} else {
			let isHorz =
				layout?.axis === "horizontal" ||
				(container instanceof UIRow && layout?.axis !== "vertical");
			systemClass = isHorz ? CLASS_HORZ : CLASS_VERT;
		}

		applyStyles(
			element,
			undefined,
			container.style,
			systemClass,
			false,
			true,
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
			if (!options && this.observed.gap) {
				options = { space: this.observed.gap, vertical: horzAxis };
			}
			this.contentUpdater.setSeparator(options, horzAxis);
		}
	}

	onFocusIn(e: ViewEvent<UIElement>) {
		if (!this.element) return;
		if (e.source !== this.observed && this.observed.allowKeyboardFocus) {
			// temporarily disable keyboard focus on this parent
			// to prevent shift-tab from selecting this element
			this.element.tabIndex = -1;
			this.lastFocused = e.source;
		}
	}

	onFocusOut(e: ViewEvent) {
		if (!this.element) return;
		if (e.source !== this.observed && this.observed.allowKeyboardFocus) {
			// make this parent focusable again
			this.element.tabIndex = 0;
			this.lastFocused = undefined;
		}
	}

	lastFocused?: UIElement;
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

	/** Set separator details; possibly update rendered separators */
	setSeparator(
		options?: UIContainer.SeparatorOptions,
		defaultVertical?: boolean,
	) {
		let oldOptions = this._sepOptions;
		this._sepOptions = options;
		if (!options && !oldOptions) return;
		let sep: HTMLElement | undefined;
		if (options?.lineWidth) {
			if (
				oldOptions &&
				oldOptions.lineWidth === options.lineWidth &&
				oldOptions.lineColor === options.lineColor &&
				oldOptions.lineMargin === options.lineMargin &&
				oldOptions.vertical === options.vertical
			)
				return;

			// create line separator element
			let vertical = options?.vertical ?? defaultVertical;
			let borderWidth = getCSSLength(options.lineWidth, "");
			let margin = getCSSLength(options.lineMargin, "");
			sep = document.createElement("hr");
			sep.className =
				CLASS_SEPARATOR_LINE +
				(vertical ? " " + CLASS_SEPARATOR_LINE_VERT : "");
			sep.style.borderWidth = borderWidth;
			sep.style.margin = margin
				? vertical
					? "0 " + margin
					: margin + " 0"
				: "";
			sep.style.borderColor = colorToCSS(
				options.lineColor || UI.colors.divider,
			);
			this.element.style.columnGap = "";
			this.element.style.rowGap = "";
		} else if (options?.space) {
			let size = getCSSLength(options.space, "0");
			if (CSS?.supports?.("gap", "1px") ?? true) {
				// if gap is supported, use pure CSS
				this.element.style.gap = size;
				return;
			}
			if (oldOptions && oldOptions.space === options.space) return;

			// otherwise, create spacer elements
			sep = document.createElement("spacer" as string);
			sep.className = CLASS_SEPARATOR_SPACER;
			sep.style.width = size;
			sep.style.height = size;
		}
		if (sep) sep.dataset.isSeparator = "true";
		this._sepTemplate = sep;

		// update all separators now
		if (sep && this._separators.size) {
			let oldSeparators = this._separators;
			this._separators = new Map();
			for (let [content, sep] of oldSeparators.entries()) {
				if (sep.parentNode !== this.element) continue;
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
	update(content: Iterable<View> = this.content, reverse?: boolean) {
		let element = this.element;
		if (this._stopped) {
			this._clearPromises();
			return;
		}
		if (!this._updateP) {
			this._updateP = Promise.resolve();
		}

		// create new content array, possibly reversed
		let newContent = [...content];
		if (reverse) newContent.reverse();

		// go through all content items and get their output
		let output: Array<RenderContext.Output<Node> | undefined> = [];
		let contentSet = new Set<View>();
		for (let it of newContent) {
			contentSet.add(it);
			output.push(this.getItemOutput(it));
		}

		// STEP 1: find deleted content and delete elements
		let hasSeparators = this._sepTemplate;
		for (let it of this.content) {
			if (!contentSet.has(it)) {
				let out = this._output.get(it);
				if (out) {
					let elt = out.element as HTMLElement;
					if (elt && elt.parentNode === element) {
						if (!elt.previousSibling && hasSeparators && elt.nextSibling) {
							// if first element, remove separator AFTER
							element.removeChild(elt.nextSibling);
						}
						if (!isMarkedForRemoval(elt)) {
							element.removeChild(elt);
						}
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
		this.content = newContent;

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

		// STEP 3: remove all leftover elements (except those marked for animated removal)
		while (cur) {
			const next = cur.nextSibling;
			if (!isMarkedForRemoval(cur as HTMLElement)) {
				element.removeChild(cur);
			}
			cur = next;
		}
		this._clearPromises();
	}

	/** Remove (resolved) promises, so that new calls to `awaitUpdateAsync()` will schedule an update */
	private _clearPromises() {
		if (this._updateResolve) this._updateResolve();
		this._updateP = undefined;
		this._updateResolve = undefined;
	}

	/** Get the current output for given content view, or render it if needed; returns the output, or undefined if the output is still being rendered. */
	getItemOutput(item: View) {
		if (!this._output.has(item)) {
			// set output to undefined first, to avoid rendering again
			this._output.set(item, undefined);
			if (this._stopped) return;

			// define rendering callback
			let isSync = true;
			let lastOutput: RenderContext.Output | undefined;
			const callback: RenderContext.RenderCallback = (output, afterRender) => {
				const scheduleAfter =
					afterRender &&
					(() => {
						if (afterRender) app.schedule(afterRender);
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
					// no output... delete last element (and separator)
					let sep = this._separators.get(item);
					if (sep && sep.parentNode === this.element) {
						this.element.removeChild(sep);
					}
					if (lastElt && lastElt.parentNode === this.element) {
						let nextSep = !lastElt.previousSibling && lastElt.nextSibling;
						if (nextSep && (nextSep as HTMLElement).dataset.isSeparator) {
							this.element.removeChild(nextSep);
						}
						if (!isMarkedForRemoval(lastElt)) {
							this.element.removeChild(lastElt);
						}
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

			// invoke render method
			try {
				item.render(callback);
			} catch (err) {
				app.log.error(err);
			}

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
		this._updateP = new Promise((r) => {
			this._updateResolve = r;
		});
		app.schedule(() => this.update());
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
	private _updateP?: Promise<void>;
	private _updateResolve?: () => void;
	private _output = new Map<View, RenderContext.Output<Node> | undefined>();
	private _sepOptions?: UIContainer.SeparatorOptions;
	private _sepTemplate?: HTMLElement;
	private _separators = new Map<View, HTMLElement>();
}
