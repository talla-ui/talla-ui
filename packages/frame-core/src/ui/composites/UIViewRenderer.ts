import { RenderContext, View, ViewClass } from "../../app/index.js";
import { Binding, ManagedEvent, Observer } from "../../base/index.js";

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
	constructor() {
		super();
		new UIViewRendererObserver().observe(this);
	}

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
	view?: View = undefined;

	render(callback?: RenderContext.RenderCallback) {
		// skip extra rendering if view didn't actually change
		if (!callback && this.view === this._renderer?.lastView) return this;

		// use given callback to (re-) render view
		if (!this._renderer) {
			this._renderer = new RenderContext.DynamicRendererWrapper();
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

	private _renderer?: RenderContext.DynamicRendererWrapper;
}

/** @internal */
class UIViewRendererObserver extends Observer<UIViewRenderer> {
	override observe(observed: UIViewRenderer) {
		return super.observe(observed).observeProperty("view");
	}
	protected override handlePropertyChange(property: string) {
		// render new view when property changes
		if (!this.observed) return;
		this.observeViewEvents();
		this.observed.render();
	}
	override stop() {
		super.stop();
		if (this._viewObserver) this._viewObserver.stop();
	}
	observeViewEvents() {
		if (this._viewObserver) this._viewObserver.stop();
		let view = this.observed?.view;
		if (!view || view.isUnlinked()) return;

		class ViewObserver extends Observer {
			constructor(public vr: UIViewRenderer) {
				super();
			}
			protected override handleUnlink(): void {
				if (this.vr.view === this.observed) {
					this.vr.view = undefined;
				}
				this.vr.emit("ViewUnlinked");
				super.handleUnlink();
			}
			protected override handleEvent(event: ManagedEvent) {
				// propagate events from view to UIViewRenderer itself
				if (!event.noPropagation) {
					event = ManagedEvent.withDelegate(event, this.vr);
					this.vr.emit(event);
				}
			}
		}
		this._viewObserver = new ViewObserver(this.observed!).observe(view);
	}
	private _viewObserver?: Observer;
}
