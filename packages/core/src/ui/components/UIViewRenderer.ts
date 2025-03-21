import { app, RenderContext, View, ViewBuilder } from "../../app/index.js";
import { Binding, ObservedEvent, ObservedObject } from "../../object/index.js";
import { invalidArgErr } from "../../errors.js";

/**
 * A view object that dynamically renders a referenced (bound) view
 *
 * @description An view renderer object renders unattached view content.
 *
 * @online_docs Refer to the online documentation for more documentation on using this UI element class.
 * @docgen {hideconstructor}
 *
 * - The rendered view is not attached to the view renderer object itself. Therefore, it must be attached to another object, such as an activity.
 */
export class UIViewRenderer extends View {
	/**
	 * Creates a new {@link ViewBuilder} instance for the current view class
	 * @see {@link View.getViewBuilder}
	 * @docgen {hide}
	 */
	declare static getViewBuilder: (preset: {
		/** A binding that references the view object to be rendered */
		view?: Binding;
		/** True if events from the referenced view should be propagated from this view renderer instance */
		propagateEvents?: boolean;
		/** Event that's emitted when the rendered view is unlinked */
		onViewUnlinked?: string;
	}) => ViewBuilder<UIViewRenderer>;

	/**
	 * True if events from the referenced view should be re-emitted from this view renderer instance
	 * - This setting defaults to false, to avoid handling the same event in two different places (e.g. activities). Set this property to true if events are not handled by the attached parent of the view itself.
	 * - Note that events that have their {@link ObservedEvent.noPropagation noPropagation} property set to true are never re-emitted.
	 */
	propagateEvents = false;

	/**
	 * The current view to be rendered
	 * - The object assigned to this property is **not** attached (like e.g. {@link UIComponent.body}). It must be attached to another object, such as an activity.
	 * - View objects can't be rendered twice, hence the bound object can't be part of the view hierarchy on its own or referenced by another {@link UIViewRenderer} instance that's currenty rendered.
	 * - If the view is unlinked after rendering, a ViewUnlinked event is emitted by the {@link UIViewRenderer} instance.
	 * - If the view is the {@link UIViewRenderer} instance itself or an attached parent, the view is not rendered (i.e. there can be no loops).
	 */
	set view(view: View | undefined) {
		if (view && !(view instanceof View)) throw invalidArgErr("view");

		// check for circular references
		let parent: ObservedObject | undefined = this;
		while (parent && parent !== view) {
			parent = ObservedObject.whence(parent);
		}
		if (parent === view) view = undefined;

		// if the view is the same as the current view, do nothing
		if (this._view === view) return;

		// stop observing old view, if any
		if (this._view) this._listener?.stop();

		// listen to new view to propagate events and watch for unlinking
		this._view = view;
		if (view) this._listener = new ViewListener(this, view);

		// re-render with new view (or empty)
		this.render();
	}
	get view(): View | undefined {
		return this._view;
	}

	render(callback?: RenderContext.RenderCallback) {
		// skip extra rendering if view didn't actually change
		if (!callback && this.view === this._renderer?.lastView) return this;

		// use given callback to (re-) render view
		this._renderer ||= new RenderContext.ViewController(app.renderer);
		this._renderer.render(this.view, callback);
		return this;
	}

	/**
	 * Searches the view hierarchy for view objects of the provided type
	 * @summary This method looks for matching view objects in the current view structure — including the current view itself. If a view object is an instance of the provided class, it's added to the list. Objects _within_ matching views aren't searched for further matches.
	 * @param type A view class
	 * @returns An array with instances of the provided view class; may be empty but never undefined.
	 */
	findViewContent<T extends View>(type: new (...args: any[]) => T): T[] {
		return this.view
			? this.view instanceof type
				? [this.view]
				: this.view.findViewContent(type)
			: [];
	}

	/** Requests input focus on the current view element */
	requestFocus() {
		this.view?.requestFocus();
		return this;
	}

	private _view?: View;
	private _listener?: ViewListener;
	private _renderer?: RenderContext.ViewController;
}

/** @internal A listener that's used to observe rendered content views */
class ViewListener {
	constructor(
		public host: UIViewRenderer,
		view: View,
	) {
		view.listen(this);
	}
	init(_view: View, stop: () => void) {
		this.stop = stop;
	}
	handler(_view: View, event: ObservedEvent) {
		if (!event.noPropagation && this.host.propagateEvents) {
			this.host.emit(event);
		}
	}
	unlinked(view: View) {
		if (this.host.view === view) {
			this.host.emit("ViewUnlinked");
			this.host.view = undefined;
		}
	}
	declare stop: () => void;
}
