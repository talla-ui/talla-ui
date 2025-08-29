import { RenderContext, View, ViewBuilder } from "../../app/index.js";
import { invalidArgErr } from "../../errors.js";
import {
	Binding,
	BindingOrValue,
	isBinding,
	ObservableObject,
} from "../../object/index.js";
import { UIAnimation } from "../style/index.js";
import type { UI } from "../UI.js";

const MIN_ANIM_REPEAT_MS = 8;

/**
 * A view object that renders and controls a referenced view
 *
 * @description A `UIShowView` object renders its contained view object, when the {@link when} property is equal to true, and the {@link unless} property is equal to false.
 *
 * The contained view object can be created from a view builder, or referenced using a binding. In the latter case, the view object is not directly attached to the `UIShowView` object, but must be attached to another object, such as an activity.
 *
 * In addition, the `UIShowView` object can be used to play animations when the view is shown or hidden, or repeatedly.
 *
 * @online_docs Refer to the online documentation for more information on using this UI element class.
 */
export class UIShowView extends View {
	constructor() {
		super();

		// add state accessors
		let when = true;
		let unless = false;
		Object.defineProperty(this, "when", {
			configurable: true,
			get() {
				return when;
			},
			set(this: UIShowView, v) {
				if (when === !!v) return;
				when = !!v;
				update(this, when && !unless);
			},
		});
		Object.defineProperty(this, "unless", {
			configurable: true,
			get() {
				return unless;
			},
			set(this: UIShowView, v) {
				if (unless === !!v) return;
				unless = !!v;
				update(this, unless ? false : when);
			},
		});
		function update(self: UIShowView, state: boolean) {
			if (inserted) self.setInsertedView(state ? inserted : undefined);
			else self.setBody(state);
			self.render();
		}

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
				let state = when && !unless;
				this.setInsertedView(state ? v : undefined);
			},
		});
	}

	/** @internal Empty event delegation method, causes all events from attached body to be propagated */
	delegate() {}

	/**
	 * True if the view content should be rendered, defaults to true
	 * - The content view is (created and) rendered only if this property is set to true, and the {@link unless} property is set to false.
	 * - If preset content is used (instead of a bound `insert` property), the content view is _unlinked_, not just hidden, when this property is set to false.
	 */
	declare when: boolean;

	/**
	 * True if the view content should not be rendered, defaults to false
	 * - The content view is (created and) rendered only if this property is set to false, and the {@link when} property is set to true.
	 * - If preset content is used (instead of a bound `insert` property), the content view is _unlinked_, not just hidden, when this property is set to true.
	 */
	declare unless: boolean;

	/** The current (attached) view content to be rendered */
	body?: View;

	/**
	 * A (bound) view to be rendered, not attached to the current view
	 * - The object assigned to this property is **not** attached. It must be attached to another object, such as an activity, in order to be rendered and for bindings to work.
	 * - View objects can't be rendered twice, hence the bound object can't be part of the view hierarchy on its own, or referenced by another {@link UIShowView} instance that's rendered at the same time.
	 */
	declare insert?: View;

	/**
	 * True if events from an inserted (not attached) content view should still be propagated from this view renderer instance
	 * - This setting defaults to false, to avoid handling the same event in two different places (e.g. activities). Set this property to true if events are not handled by the attached parent of the view itself.
	 * - Note that events that have their {@link ObservableEvent.noPropagation noPropagation} property set to true are never re-emitted.
	 */
	propagateInsertedEvents = false;

	/** Animation that will be played automatically when the content view is shown */
	showAnimation?: UIAnimation;

	/** Animation that will be played when the content view is hidden */
	hideAnimation?: UIAnimation;

	/** Animation that will be played repeatedly after the content view is shown */
	repeatAnimation?: UIAnimation;

	/** True if first appearance should not be animated */
	ignoreFirstShowAnimation?: boolean;

	render(callback?: RenderContext.RenderCallback) {
		// skip extra rendering if view didn't actually change
		let view = this.body;
		if (!callback && view === this._renderer?.lastView) return this;

		// create a new renderer if needed
		this._renderer ||= new RenderContext.ViewController();
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
	}

	/** Plays the specified animation on the last output element rendered by the content view */
	async playAsync(animation?: UIAnimation, repeat?: boolean) {
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
	}

	/** @internal Creates or removes the body view content when state changes */
	setBody(state?: boolean) {
		if (!state) {
			this.body?.unlink();
			this.body = undefined;
		}
	}

	/** @internal Sets the inserted view */
	setInsertedView(view: View | undefined) {
		if (view) {
			if (!(view instanceof View)) throw invalidArgErr("view");

			// check for circular references
			let parent: ObservableObject | undefined = this;
			while (parent && parent !== view) {
				parent = ObservableObject.whence(parent);
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

export namespace UIShowView {
	/**
	 * Creates a view builder for a conditional view renderer.
	 * @param condition A boolean value or binding that determines when to show the content.
	 * @param content A view builder for the content to show/hide (alternatively, use `.show()` method)
	 * @returns A builder object for configuring the show view.
	 * @see {@link UIShowView}
	 */
	export function showWhenBuilder(
		condition: BindingOrValue<boolean>,
		content?: ViewBuilder<View>,
		elseContent?: ViewBuilder<View>,
	) {
		let b = new ShowBuilder().when(condition);
		if (content) b.show(content);
		if (elseContent) b.else(elseContent);
		return b;
	}

	/**
	 * Creates a view builder for a conditional view renderer.
	 * @param condition A boolean value or binding that determines when to hide the content.
	 * @param content A view builder for the content to show/hide (alternatively, use `.show()` method)
	 * @returns A builder object for configuring the show view.
	 * @see {@link UIShowView}
	 */
	export function showUnlessBuilder(
		condition: BindingOrValue<boolean>,
		content?: ViewBuilder<View>,
		elseContent?: ViewBuilder<View>,
	) {
		let b = new ShowBuilder().unless(condition);
		if (content) b.show(content);
		if (elseContent) b.else(elseContent);
		return b;
	}

	/**
	 * Creates a view builder for a conditional, bound, and/or animated view renderer.
	 * - To render a bound view, make sure that the view is attached to another object, such as an activity (using {@link ObservableObject.attach()}).
	 * - Events from bound views are not propagated by default (i.e. they're presumed to be handled by the parent of the view itself), unless the `propagateInsertedEvents` parameter is set to true.
	 * @param content A view builder for static content, or a binding to a dynamic view.
	 * @param propagateInsertedEvents If true, events from dynamically inserted views are propagated by re-emitting them on the {@link UIShowView} instance.
	 * @returns A builder object for configuring the show view.
	 * @see {@link UIShowView}
	 */
	export function showBuilder(
		content: ViewBuilder<View> | Binding<View>,
		propagateInsertedEvents?: boolean,
	) {
		return new ShowBuilder().show(content, propagateInsertedEvents);
	}

	/**
	 * A builder class for creating `UIShowView` instances.
	 * - Objects of this type are returned by the `UI.ShowWhen()`, `UI.ShowUnless()`, and `UI.Show()` functions.
	 */
	export class ShowBuilder implements ViewBuilder<UIShowView> {
		/** The initializer that is used to create each view instance */
		readonly initializer = new ViewBuilder.Initializer(UIShowView, (view) => {
			let content = this._content;
			let elseContent = this._elseContent;
			if (content || elseContent) {
				view.setBody = function (state) {
					let body = (state ? content : elseContent)?.create();
					this.body?.unlink();
					this.body = body && this.attach(body, { delegate: this });
				};
				view.setBody(view.when && !view.unless);
			}
		});

		/** Content to show conditionally */
		private _content?: ViewBuilder<View>;

		/** Content to show conditionally */
		private _elseContent?: ViewBuilder<View>;

		/**
		 * Creates a new instance of the view renderer.
		 * @returns A newly created and initialized `UIShowView` instance.
		 */
		create() {
			return this.initializer.create();
		}

		/**
		 * Intercepts an event from the view and re-emits it with a different name.
		 * @note Events from list item views automatically have the `listViewItem` property added to the data object, before being propagated on the list view itself.
		 * @param origEvent The name of the event to intercept.
		 * @param emit The new event name to emit, or a function to call.
		 * @param data The data properties to add to the alias event, if any
		 * @param forward Whether to forward the original event as well (defaults to false)
		 * @returns The builder instance for chaining.
		 */
		intercept(
			origEvent: string,
			emit: string | ObservableObject.InterceptHandler<UIShowView>,
			data?: Record<string, unknown>,
			forward?: boolean,
		) {
			this.initializer.intercept(origEvent, emit, data, forward);
			return this;
		}

		/**
		 * Sets the condition for showing the content, using {@link UIShowView.when}.
		 * @param when A boolean value or binding. The content is shown when this is truthy.
		 * @returns The builder instance for chaining.
		 */
		when(when: BindingOrValue<boolean>) {
			this.initializer.set("when", when);
			return this;
		}

		/**
		 * Sets the condition for hiding the content, using {@link UIShowView.unless}.
		 * @param unless A boolean value or binding. The content is hidden when this is truthy.
		 * @returns The builder instance for chaining.
		 */
		unless(unless: BindingOrValue<boolean>) {
			this.initializer.set("unless", unless);
			return this;
		}

		/**
		 * Sets the content to be shown or hidden, either from a view builder or a binding.
		 * - To render a bound view, make sure that the view is attached to another object, such as an activity (using {@link ObservableObject.attach()}).
		 * - Events from bound views are not propagated by default (i.e. they're presumed to be handled by the parent of the view itself), unless the `propagateInsertedEvents` parameter is set to true.
		 * @param content A view builder for static content, or a binding to a dynamic view.
		 * @param propagateInsertedEvents If true, events from dynamically inserted views are propagated by re-emitting them on the {@link UIShowView} instance.
		 * @returns The builder instance for chaining.
		 */
		show(
			content: ViewBuilder<View> | Binding<View>,
			propagateInsertedEvents?: boolean,
		) {
			if (isBinding(content)) {
				this.initializer.finalize((view) => {
					view.observe(content, function (value) {
						this.propagateInsertedEvents = !!propagateInsertedEvents;
						this.insert = value;
					});
				});
			} else {
				this._content = content;
			}
			return this;
		}

		else(content: ViewBuilder<View>) {
			this._elseContent = content;
			return this;
		}

		/**
		 * Sets the animation to be played when the content is shown.
		 * @param animation A theme animation name, a {@link UIAnimation} instance, or a binding.
		 * @param ignoreFirst If `true`, the animation is skipped on the first appearance.
		 * @returns The builder instance for chaining.
		 */
		showAnimation(
			animation: BindingOrValue<UIAnimation | UI.AnimationName | undefined>,
			ignoreFirst?: boolean,
		) {
			this.initializer.update(ignoreFirst, function (value) {
				this.ignoreFirstShowAnimation = !!value;
			});
			return this._setAnimation("showAnimation", animation);
		}

		/**
		 * Sets the animation to be played when the content is hidden.
		 * @param animation A theme animation name, a {@link UIAnimation} instance, or a binding.
		 * @returns The builder instance for chaining.
		 */
		hideAnimation(
			animation: BindingOrValue<UIAnimation | UI.AnimationName | undefined>,
		) {
			return this._setAnimation("hideAnimation", animation);
		}

		/**
		 * Sets an animation to be played repeatedly while the content is visible.
		 * @param animation A theme animation name, a {@link UIAnimation} instance, or a binding.
		 * @returns The builder instance for chaining.
		 */
		repeatAnimation(
			animation: BindingOrValue<UIAnimation | UI.AnimationName | undefined>,
		) {
			return this._setAnimation("repeatAnimation", animation);
		}

		private _setAnimation(
			k: "showAnimation" | "hideAnimation" | "repeatAnimation",
			animation: BindingOrValue<UIAnimation | UI.AnimationName | undefined>,
		) {
			this.initializer.update(animation, function (value) {
				if (typeof value === "string")
					value = UIAnimation.theme.ref(value as any);
				this[k] = value;
			});
			return this;
		}
	}
}
