import { RenderContext, View, ViewClass } from "../../app/index.js";
import { Binding, ManagedEvent } from "../../base/index.js";
import { invalidArgErr } from "../../errors.js";

/**
 * A view object that dynamically renders a referenced (bound) view
 *
 * @description An view renderer component renders unattached view content within its parent view component.
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 *
 * - The rendered view is not attached to the view renderer object itself. Therefore, it must be attached to another object, such as an activity.
 */
export class UIViewRenderer extends View {
	/**
	 * Applies the provided preset properties to this object
	 * - This method is called automatically. Do not call this method after constructing an instance
	 */
	override applyViewPreset(preset: {
		/** A binding that references the view object to be rendered */
		view?: Binding;
		/** Event that's emitted when the rendered view is unlinked */
		onViewUnlinked?: string;
	}) {
		super.applyViewPreset(preset);
	}

	/**
	 * The current view to be rendered
	 * - The object assigned to this property is **not** attached (like e.g. {@link ViewComposite.body}). It must be attached to another object, such as an activity.
	 * - View objects can't be rendered twice, hence the bound object can't be part of the view hierarchy on its own or referenced by another {@link UIViewRenderer} instance.
	 * - If the view is unlinked after rendering, a ViewUnlinked event is emitted by the {@link UIViewRenderer} instance.
	 */
	set view(view: View | undefined) {
		if (view && !(view instanceof View)) throw invalidArgErr("view");
		if (this._view === view) return;

		// stop observing old view, if any
		if (this._view) this._listener?.stop();

		// observe new view to delegate events and watch for unlinking
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
		if (!this._renderer) {
			this._renderer = new RenderContext.ViewController();
		}
		this._renderer.render(this.view, callback);
		return this;
	}

	/**
	 * Searches the view hierarchy for view objects of the provided type
	 * @summary This method looks for matching view objects in the current view structure — including the current view itself. If a component is an instance of the provided class, it's added to the list. Components _within_ matching components aren't searched for further matches.
	 * @param type A view class
	 * @returns An array with instances of the provided view class; may be empty but never undefined.
	 */
	findViewContent<T extends View>(type: ViewClass<T>): T[] {
		return this.view
			? this.view instanceof type
				? [this.view]
				: this.view.findViewContent(type)
			: [];
	}

	/** Requests input focus on the current view element */
	requestFocus() {
		if (this.view) this.view.requestFocus();
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
	handler(_view: View, event: ManagedEvent) {
		if (!event.noPropagation) {
			event = ManagedEvent.withDelegate(event, this.host);
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
