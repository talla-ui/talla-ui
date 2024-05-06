import { View, ViewClass, ViewComposite } from "../../app/index.js";

/**
 * A view composite that automatically creates and unlinks the contained view
 *
 * @description A conditional component creates and renders its contained content based on the value of the {@link state} property.
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export class UIConditionalView extends ViewComposite {
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
						this.body = this.attach(new this._Body(), (e) => {
							this.delegateViewEvent(e);
						});
					} else {
						if (this.body) this.body.unlink();
						this.body = undefined;
					}
					this.render();
				}
			},
		});
	}

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

	/** The conditional view body, constructed each time state becomes true */
	private _Body?: ViewClass;
}
