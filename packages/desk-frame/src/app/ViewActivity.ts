import { bound, ManagedEvent, ManagedObject, Observer } from "../core/index.js";
import { errorHandler } from "../errors.js";
import { Activity } from "./Activity.js";
import { app } from "./GlobalContext.js";
import { NavigationTarget } from "./NavigationTarget.js";
import { RenderContext } from "./RenderContext.js";
import { View, ViewClass } from "./View.js";

const _boundRenderer = bound("renderer");

/** Global list of activity instances for (old) activity class, for HMR */
const _hmrInstances = new WeakMap<typeof Activity, ViewActivity[]>();

/**
 * A class that represents a part of the application that can be activated to display an accompanying view
 *
 * @description
 * View activities represent a possible 'place' for the user in an application, with an accompanying view — a screen, dialog, or a view that's displayed as part of a containing view activity.
 *
 * Views are linked to view activities using the **static** {@link ViewActivity.ViewBody ViewBody} property. Using the constructor referenced by this property, views are created and rendered automatically when the activity becomes active. Views are also automatically removed again when the activity is deactivated. Alternatively, override the {@link ViewActivity.createViewAsync()} method to change the way views are created for a particular type of activity.
 *
 * The base ViewActivity class doesn't specify how views should be rendered; use the {@link PageViewActivity} or {@link DialogViewActivity} classes instead for main view activities, or set the {@link ViewActivity.renderPlacement renderPlacement} object in the constructor with options defined by {@link RenderContext.PlacementOptions}.
 *
 * View activities can also be nested (attached to a containing view activity), and rendered using {@link UIViewRenderer}.
 *
 * Finally, view activities may be able to re-render dynamically in 'hot reload' scenarios; refer to {@link GlobalContext.hotReload app.hotReload()} for details.
 *
 * @see {@link PageViewActivity}
 * @see {@link DialogViewActivity}
 *
 * @example
 * // Create a view activity and activate it:
 * import MyView from "./MyView.js";
 * class MyActivity extends ViewActivity {
 *   static override ViewBody = MyView;
 *   constructor() {
 *     super();
 *     this.renderPlacement = { mode: "mount", mountId: "app" };
 *   }
 *   override protected async afterActiveAsync() {
 *     console.log("MyActivity is now active");
 *   }
 * }
 *
 * app.addActivity(new MyActivity(), true);
 */
export class ViewActivity extends Activity implements RenderContext.Renderable {
	/** @internal Update prototype for given class with newer prototype, and rebuild view */
	static override _$hotReload(
		Old: undefined | typeof Activity,
		Updated: typeof ViewActivity,
	) {
		super._$hotReload(Old, Updated);
		Updated.prototype._hotReload = true;
		_hmrInstances.set(Updated, []);
		if (Old && Updated.prototype instanceof ViewActivity) {
			if ((Old as typeof ViewActivity).ViewBody && Updated.ViewBody) {
				(Old as typeof ViewActivity).ViewBody = Updated.ViewBody;
			}
			let instances = _hmrInstances.get(Old);
			if (instances) {
				for (let activity of instances) {
					if (activity.view) activity.createViewAsync().catch(errorHandler);
				}
			}
		}
	}

	/**
	 * A constructor that will be used to create the view object when the activity becomes active
	 * - In practice, this property is overridden by an activity class to refer to the view preset (a constructor created using `.with()` methods or using JSX syntax), imported from a separate view file.
	 */
	declare static ViewBody?: ViewClass;

	/** Creates an instance of this view activity, without an active view */
	constructor() {
		super();

		_boundRenderer.bindTo(this, "renderer");

		// auto-attach view and delegate events
		class ViewObserver extends Observer<View> {
			constructor(public activity: ViewActivity) {
				super();
			}
			protected override handleEvent(event: ManagedEvent<any>) {
				if (this.activity.isActive()) {
					this.activity.delegateViewEvent(event);
					if (
						event.name === "FocusIn" &&
						typeof event.source.requestFocus === "function"
					) {
						this.activity._lastFocused = event.source;
					}
				}
			}
		}
		this.observeAttach("view", new ViewObserver(this));

		// observe properties (async) to render/remove automatically
		class ViewActivityObserver extends Observer<ViewActivity> {
			override observe(observed: ViewActivity) {
				return super
					.observe(observed)
					.observePropertyAsync("renderer", "view", "renderPlacement");
			}
			protected override async handlePropertyChange() {
				this.observed && this.observed.render();
			}
			onActive() {
				this.observed && this.observed.render();
			}
			protected override handleUnlink() {
				this.observed &&
					this.observed._renderWrapper &&
					this.observed._renderWrapper.removeAsync();
				super.handleUnlink();
			}
		}
		new ViewActivityObserver().observe(this);
	}

	/** A (bound) reference to the application render context */
	readonly renderer?: RenderContext;

	/**
	 * The view to be rendered
	 * - The view is rendered automatically when this property is set. However, there's no need to set this property manually: a view instance is created automatically when the activity becomes active.
	 */
	declare view?: View;

	/** Placement options for root view output */
	renderPlacement?: RenderContext.PlacementOptions = undefined;

	/**
	 * Searches the view hierarchy for view objects of the provided type
	 * @summary This method looks for matching view objects in the current view structure — including the activity's view itself. If a component is an instance of the provided class, it's added to the list. Components _within_ matching components aren't searched for further matches.
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

	/** Requests input focus on the current view element, or the last focused view element, if any */
	requestFocus() {
		(this._lastFocused && this._lastFocused.requestFocus()) ||
			(this.view && this.view.requestFocus());
		return this;
	}

	/**
	 * Delegates events from the current view
	 * - This method is called automatically when an event is emitted by the current view object.
	 * - The base implementation calls activity methods starting with `on`, e.g. `onClick` for a `Click` event. The event is passed as a single argument, and the return value should either be `true`, undefined, or a promise (which is awaited just to be able to handle any errors).
	 * - This method may be overridden to handle events in any other way, e.g. to propagate them by emitting the same event on the ViewActivity instance itself.
	 * @param event The event to be delegated (from the view)
	 * @returns True if an event handler was found, and it returned true; false otherwise.
	 */
	protected delegateViewEvent(event: ManagedEvent) {
		// find own handler method
		let method = (this as any)["on" + event.name];
		if (typeof method === "function") {
			let result = method.call(this, event);

			// return true or promise result, otherwise false below
			if (result === true) return true;
			if (result && result.then && result.catch) {
				return (result as Promise<void>).catch(errorHandler);
			}
		}
		return false;
	}

	/**
	 * Creates a view using {@link createViewAsync()}, overridden from Activity
	 * - When overriding this method further, make sure to invoke and await `super.afterActiveAsync()` — otherwise the view won't be created.
	 */
	protected override async afterActiveAsync() {
		if (!this.view) this.createViewAsync();
		if (this._hotReload) {
			let instances = _hmrInstances.get(this.constructor as any);
			if (instances) instances.push(this);
		}
	}

	/** Removes the current view, overridden from Actviity */
	protected override async beforeInactiveAsync() {
		if (this.view) this.view = undefined;
	}

	/** Creates a view and sets the {@link ViewActivity.view view} property, may be overridden */
	protected async createViewAsync() {
		let ViewBody = (this.constructor as typeof ViewActivity).ViewBody;
		if (ViewBody) this.view = new ViewBody();
	}

	/**
	 * Renders the current view, if any
	 * - This method is called automatically whenever required. It should not be necessary to invoke this method from an application.
	 */
	render(callback?: RenderContext.RenderCallback) {
		let view = this.isActive() ? this.view : undefined;
		if (this._renderWrapper) {
			this._renderWrapper.render(view, callback, this.renderPlacement);
		} else if (this.renderer && (view || callback)) {
			this._renderWrapper = this.renderer.render(
				view,
				callback,
				this.renderPlacement,
			);
		}
		return this;
	}

	/**
	 * Handles the `Navigate` event
	 * - This method is called automatically when a view object emits the `Navigate` event. Such events are emitted from views that include a `getNavigationTarget` method, such as {@link UIButton}.
	 * - This method calls {@link handleNavigateAsync} in turn, which may be overridden.
	 */
	protected onNavigate(
		e: ManagedEvent<
			ManagedObject & { getNavigationTarget?: () => NavigationTarget }
		>,
	) {
		if (
			this.activationPath &&
			typeof e.source.getNavigationTarget === "function"
		) {
			return this.handleNavigateAsync(e.source.getNavigationTarget());
		}
	}

	/**
	 * Handles navigation to a provided navigation target
	 * - This method is called automatically by {@link onNavigate} when a view object emits the `Navigate` event. It may be overridden to handle navigation differently, e.g. for master-detail view activities.
	 */
	protected async handleNavigateAsync(target: NavigationTarget) {
		if (this.activationPath) {
			await this.activationPath.navigateAsync(String(target));
		}
	}

	private declare _hotReload?: boolean;

	private _renderWrapper?: RenderContext.DynamicRendererWrapper;
	private _lastFocused?: View;
}

/**
 * A {@link ViewActivity} class with a view that will be rendered as a full-screen page
 * - This class sets {@link ViewActivity.renderPlacement} to `{ mode: "page" }` in its constructor, causing the view to be rendered full-screen.
 *
 * @example
 * // Create a page view activity and activate it:
 * import MyView from "./MyView.js";
 * class MyActivity extends PageViewActivity {
 *   static override ViewBody = MyView;
 *   override protected async afterActiveAsync() {
 *     console.log("MyActivity is now active");
 *   }
 * }
 *
 * app.addActivity(new MyActivity(), true);
 */
export class PageViewActivity extends ViewActivity {
	constructor() {
		super();
		this.renderPlacement = { mode: "page" };
	}
}

/**
 * A {@link ViewActivity} class with a view that will be rendered as a modal dialog
 * - This class sets {@link ViewActivity.renderPlacement} to `{ mode: "dialog", ... }` in its constructor, causing the view to be rendered as a modal dialog. The backdrop shader opacity and animations (`show-dialog` and `hide-dialog`) from the current theme are also used.

 * @example
 * // Create a dialog view activity, use it from another activity:
 * import MyView from "./MyView.js";
 * class MyActivity extends DialogViewActivity {
 *   static override ViewBody = MyView;
 *   override protected async afterActiveAsync() {
 *     console.log("MyActivity is now active");
 *   }
 * 
 *   // Handle a `Close` event from the view: unlink the activity
 *   onClose() {
 *     this.unlink();
 *   }
 * }
 * 
 * class MyParentActivity extends Activity {
 *   // ...
 * 
 *   async showDialogAsync() {
 *     let dialog = this.attach(new MyDialog());
 *     await dialog.activateAsync();
 *     // ... use dialog here, or observe it
 *   }
 * }
 *
 */
export class DialogViewActivity extends ViewActivity {
	constructor() {
		super();
		let shade = app.theme?.modalDialogShadeOpacity;
		let show = app.theme?.animations?.["show-dialog"];
		let hide = app.theme?.animations?.["hide-dialog"];
		this.renderPlacement = {
			mode: "dialog",
			shade,
			transform: { show, hide },
		};
	}
}
