import { app, RenderContext, View, ViewBuilder } from "../../app/index.js";

/**
 * A view composite that automatically creates and unlinks the contained view
 *
 * @description A conditional component creates and renders its contained content based on the value of the {@link state} property.
 *
 * @online_docs Refer to the online documentation for more documentation on using this UI component class.
 */
export class UIConditionalView extends View {
	/**
	 * Creates a new {@link ViewBuilder} instance for the current view class
	 * @see {@link View.getViewBuilder}
	 * @docgen {hide}
	 */
	static override getViewBuilder(
		preset: ViewBuilder.ExtendPreset<typeof View, UIConditionalView, "state">,
		builder?: ViewBuilder,
	) {
		// set all properties
		let b = super.getViewBuilder(preset) as ViewBuilder<UIConditionalView>;
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

		// add state accessor (observable)
		let state = false;
		Object.defineProperty(this, "state", {
			configurable: true,
			get() {
				return state;
			},
			set(this: UIConditionalView, v) {
				state = !!v;
				if (!!this.body !== state) {
					state ? this.setBody() : this.removeBody();
				}
				this.render();
			},
		});
	}

	/** @internal Empty event delegation method, causes all events from attached body to be delegated */
	delegate() {}

	/**
	 * The current state of this conditional view
	 * - The content view is created and rendered only if this property is set to true.
	 * - The content view is _unlinked_, not just hidden, when this property is set to false.
	 */
	declare state: boolean;

	/** The current view content to be rendered */
	body?: View;

	render(callback?: RenderContext.RenderCallback) {
		// skip extra rendering if view didn't actually change
		if (!callback && this.body === this._renderer?.lastView) return this;

		// use given callback to (re-) render view
		this._renderer ||= new RenderContext.ViewController(app.renderer);
		this._renderer.render(this.body, callback);
		return this;
	}

	/**
	 * Searches the view hierarchy for view objects of the provided type
	 * @summary This method looks for matching view objects in the current view structure — including the current view itself. If a component is an instance of the provided class, it's added to the list. Components _within_ matching components aren't searched for further matches.
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

	/** Stateful renderer wrapper, handles content component */
	private _renderer?: RenderContext.ViewController;
}
