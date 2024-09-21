import {
	RenderContext,
	View,
	ViewClass,
	ViewComposite,
} from "../../app/index.js";

/**
 * A view composite that automatically creates and unlinks the contained view
 *
 * @description A conditional component creates and renders its contained content based on the value of the {@link state} property.
 *
 * @online_docs Refer to the online documentation for more documentation on using this UI component class.
 */
export class UIConditionalView extends View {
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
					if (state && this._Body) {
						this.body = this.attach(new this._Body(), { delegate: this });
					} else {
						this.body?.unlink();
						this.body = undefined;
					}
					this.render();
				}
			},
		});
	}

	/** @internal Empty event delegation method, causes all events from attached body to be delegated */
	delegate() {}

	/**
	 * Applies the provided preset properties to this object
	 * - This method is called automatically. Do not call this method after constructing an instance
	 */
	override applyViewPreset(
		preset: View.ExtendPreset<ViewComposite, UIConditionalView, "state">,
	) {
		if ((preset as any).Body) {
			this._Body = (preset as any).Body;
			delete (preset as any).Body;
		}
		super.applyViewPreset(preset);
	}

	/**
	 * The current state of this conditional view
	 * - The content view is created and rendered only if this property is set to true.
	 * - The content view is _unlinked_, not just hidden, when this property is set to false.
	 */
	declare state: boolean;

	/** The current view content to be rendered */
	body?: View;

	/** The conditional view body, constructed each time state becomes true */
	private _Body?: ViewClass;

	render(callback?: RenderContext.RenderCallback) {
		// skip extra rendering if view didn't actually change
		if (!callback && this.body === this._renderer?.lastView) return this;

		// use given callback to (re-) render view
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

	/** Stateful renderer wrapper, handles content component */
	private _renderer = new RenderContext.ViewController();
}
