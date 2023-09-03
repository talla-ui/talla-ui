import { RenderContext, View, ViewClass } from "../../app/index.js";
import { Binding, ManagedEvent, Observer } from "../../core/index.js";

/**
 * A view object that dynamically renders a referenced (bound) view
 *
 * @description An view renderer component renders unattached view content within its parent view component.
 *
 * **JSX tag:** `<render>`
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 *
 * - The rendered view may be a UI component, such as an instance of {@link UICell} or {@link UIButton}. However, the object must be attached (see {@link ManagedObject.attach()}) to an object that's itself attached to the application instance — such as a (view) activity.
 * - View activities can also be rendered directly using this component. However, note that activities must also be attached to the application instance (or another activity that's itself attached), and their views are only created when the activity is activated (see {@link ViewActivity}).
 */
export class UIViewRenderer extends View {
	/**
	 * Creates a preset controller class with a specified view binding
	 * @param preset An object that contains a binding for the referenced view
	 * @returns A class that can be used to create instances of this view class with the provided view binding
	 */
	static with(preset: {
		/** A binding that references the view object to be rendered */
		view?: Binding;
	}): typeof UIViewRenderer {
		return class PresetView extends this {
			constructor() {
				super();
				this.applyViewPreset({ ...preset });
			}
		};
	}

	constructor() {
		super();
		new UIViewRendererObserver().observe(this);
	}

	/**
	 * The current view to be rendered
	 * - The object assigned to this property is **not** attached (like e.g. {@link ViewComposite.body}). It must be attached to another object, such as a view activity or composite.
	 * - View objects can't be rendered twice, hence the bound object can't be part of the view hierarchy on its own or referenced by another {@link UIViewRenderer} instance.
	 */
	view?: View = undefined;

	render(callback?: RenderContext.RenderCallback) {
		// skip extra rendering if view didn't actually change
		if (!callback && this.view === this._renderer?.lastContent) return this;

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
		if (!this.observed || !this.observed.view) return;
		let viewRenderer = this.observed;
		class ViewObserver extends Observer {
			protected override handleUnlink(): void {
				if (viewRenderer.view === this.observed) {
					viewRenderer.view = undefined;
				}
				super.handleUnlink();
			}
			protected override handleEvent(event: ManagedEvent) {
				// propagate events from view to UIViewRenderer itself
				if (!(event as RenderContext.RendererEvent).isRendererEvent) {
					viewRenderer.emit(
						new ManagedEvent(
							event.name,
							event.source,
							event.data,
							viewRenderer,
							event
						)
					);
				}
			}
		}
		this._viewObserver = new ViewObserver().observe(this.observed.view);
	}
	private _viewObserver?: Observer;
}
