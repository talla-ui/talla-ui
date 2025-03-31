import { app, RenderContext, View, ViewBuilder } from "../../app/index.js";
import { invalidArgErr } from "../../errors.js";
import { ObservedObject } from "../../object/index.js";

const MIN_ANIM_REPEAT_MS = 8;

/**
 * A UI component that renders and controls a view
 *
 * @description A `UIShowView` object renders its contained view object, when the {@link state} property is true.
 *
 * The contained view object can be preset (using {@link ui.show()}, or the `<show>` tag), or dynamically set or bound using the {@link insert} property. In the latter case, the view object is not directly attached to the `UIShowView` object, but must be attached to another object, such as an activity.
 *
 * In addition, the `UIShowView` object can be used to play animations when the view is shown or hidden, or repeatedly.
 *
 * @online_docs Refer to the online documentation for more documentation on using this UI element class.
 */
export class UIShowView extends View {
	/**
	 * Creates a new {@link ViewBuilder} instance for the current view class
	 * @see {@link View.getViewBuilder}
	 * @docgen {hide}
	 */
	static override getViewBuilder(
		preset: ViewBuilder.ExtendPreset<
			typeof View,
			UIShowView,
			| "state"
			| "insert"
			| "propagateInsertedEvents"
			| "showAnimation"
			| "hideAnimation"
			| "repeatAnimation"
			| "ignoreFirstShowAnimation"
		>,
		builder?: ViewBuilder,
	) {
		// set all properties
		let b = super.getViewBuilder(preset) as ViewBuilder<UIShowView>;
		return b.addInitializer((view) => {
			// add a method to create and attach the body view
			view.setBody = function () {
				let body = builder?.create();
				this.body = body && this.attach(body, { delegate: this });
			};

			// create and attach the body view if state is already true
			if (view.state) view.setBody();
		});
	}

	constructor() {
		super();

		// add inserted view accessor
		let inserted: View | undefined;
		Object.defineProperty(this, "insert", {
			configurable: true,
			get() {
				return inserted;
			},
			set(this: UIShowView, v) {
				if (v === inserted) return;
				inserted = v;
				this.setInsertedView(state ? v : undefined);
			},
		});

		// add state accessor
		let state = true;
		Object.defineProperty(this, "state", {
			configurable: true,
			get() {
				return state;
			},
			set(this: UIShowView, v) {
				state = !!v;
				if (!!this.body !== state) {
					if (inserted) this.setInsertedView(state ? inserted : undefined);
					else state ? this.setBody() : this.removeBody();
				}
				this.render();
			},
		});
	}

	/** @internal Empty event delegation method, causes all events from attached body to be delegated */
	delegate() {}

	/**
	 * True if the view content should be rendered, defaults to true
	 * - The content view is (created and) rendered only if this property is set to true.
	 * - If preset content is used (instead of a bound `insert` property), the content view is _unlinked_, not just hidden, when this property is set to false.
	 */
	declare state: boolean;

	/** The current (attached) view content to be rendered */
	body?: View;

	/**
	 * A view to be rendered, not attached to the current view
	 * - The object assigned to this property is **not** attached (like e.g. {@link UIComponent.body}). It must be attached to another object, such as an activity.
	 * - View objects can't be rendered twice, hence the bound object can't be part of the view hierarchy on its own or referenced by another {@link UIShowView} instance that's currenty rendered.
	 */
	declare insert?: View;

	/**
	 * True if events from an inserted (not attached) content view should still be propagated from this view renderer instance
	 * - This setting defaults to false, to avoid handling the same event in two different places (e.g. activities). Set this property to true if events are not handled by the attached parent of the view itself.
	 * - Note that events that have their {@link ObservedEvent.noPropagation noPropagation} property set to true are never re-emitted.
	 */
	propagateInsertedEvents = false;

	/** Animation that will be played automatically when the content view is shown */
	showAnimation?: RenderContext.OutputTransformer;

	/** Animation that will be played when the content view is hidden (through `UIRenderable.hidden` property or `UIConditionalView`) */
	hideAnimation?: RenderContext.OutputTransformer;

	/** Animation that will be played repeatedly after the content view is shown */
	repeatAnimation?: RenderContext.OutputTransformer;

	/** True if first appearance should not be animated */
	ignoreFirstShowAnimation?: boolean;

	render(callback?: RenderContext.RenderCallback) {
		// skip extra rendering if view didn't actually change
		let view = this.body;
		if (!callback && view === this._renderer?.lastView) return this;

		// create a new renderer if needed
		this._renderer ||= new RenderContext.ViewController(app.renderer);
		let isFirst = !this._renderer.isRendered();

		// render (or remove) the body view
		if (!view) {
			this._renderer.removeAsync();
		}
		let show =
			isFirst && this.ignoreFirstShowAnimation ? undefined : this.showAnimation;
		let hide = this.hideAnimation;
		this._renderer.render(
			view,
			callback,
			show || hide
				? { mode: "none" as const, transform: { show, hide } }
				: undefined,
		);
		if (view && this.repeatAnimation) {
			this.playAsync(this.repeatAnimation, true);
		}
		return this;
	}

	/** Plays the specified animation on the last output element rendered by the content view */
	async playAsync(
		animation?: RenderContext.OutputTransformer,
		repeat?: boolean,
	) {
		// prepare everything in advance
		let renderer = this._renderer?.renderer;
		let output = this._renderer?.lastRenderOutput;
		if (!animation || !output || !renderer) return;

		// loop if repeating, otherwise run transform just once
		let update = this._updated;
		await Promise.resolve();
		while (this.body && this._updated === update) {
			// use a promise to avoid a blocking infinite loop
			let minRepeatPromise = repeat
				? new Promise((r) => setTimeout(r, MIN_ANIM_REPEAT_MS))
				: undefined;
			await renderer.animateAsync(output, animation);
			if (!repeat) return;
			await minRepeatPromise;
		}
	}

	/**
	 * Searches the view hierarchy for view objects of the provided type
	 * @summary This method looks for matching view objects in the current view structure — including the current view itself. If a view object is an instance of the provided class, it's added to the list. Objects _within_ matching views aren't searched for further matches.
	 * @param type A view class
	 * @returns An array with instances of the provided view class; may be empty but never undefined.
	 */
	findViewContent<T extends View>(type: new (...args: any[]) => T): T[] {
		return this.body
			? this.body instanceof type
				? [this.body]
				: this.body.findViewContent(type)
			: [];
	}

	/** Requests input focus on the current view element */
	requestFocus() {
		this.body?.requestFocus();
		return this;
	}

	/** @internal Creates the body view content when state becomes true */
	setBody() {}

	/** @internal Removes the view content when state becomes false */
	removeBody() {
		this.body?.unlink();
		this.body = undefined;
	}

	/** @internal Sets the inserted view */
	setInsertedView(view: View | undefined) {
		if (view) {
			if (!(view instanceof View)) throw invalidArgErr("view");

			// check for circular references
			let parent: ObservedObject | undefined = this;
			while (parent && parent !== view) {
				parent = ObservedObject.whence(parent);
			}
			if (parent === view) view = undefined;
		}

		// stop observing the old inserted view, if any
		this._stopInsertedView?.();

		// observe the new inserted view, if any
		view?.listen({
			init: (_, stop) => {
				this._stopInsertedView = stop;
			},
			handler: (_, event) => {
				if (event.noPropagation || !this.propagateInsertedEvents) return;
				this.emit(event);
			},
		});

		// set the body view and re-render
		this.body = view;
		this.render();
	}

	/** Stateful renderer wrapper, handles content view */
	private _renderer?: RenderContext.ViewController;

	/** Number of times the view has been updated */
	private _updated = 0;

	/** Callback to stop observing the inserted view */
	private _stopInsertedView?: () => void;
}
