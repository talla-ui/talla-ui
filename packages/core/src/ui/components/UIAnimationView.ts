import { app, RenderContext, View, ViewBuilder } from "../../app/index.js";
import { errorHandler } from "../../errors.js";
import { UIComponent } from "./UIComponent.js";

const MIN_REPEAT_MS = 8;

let _nextUpdateId = 1;

/**
 * A UI component that manages animation playback on the contained view
 *
 * @description An animation controller view can be used to play animations and/or automatically play them when the contained UI element is shown or hidden.
 *
 * @online_docs Refer to the online documentation for more documentation on using this UI element class.
 */
export class UIAnimationView extends UIComponent {
	/**
	 * Creates a new {@link ViewBuilder} instance for the current view class
	 * @see {@link View.getViewBuilder}
	 * @docgen {hide}
	 */
	static override getViewBuilder(
		preset: ViewBuilder.ExtendPreset<
			typeof View,
			UIAnimationView,
			"showAnimation" | "hideAnimation" | "repeatAnimation" | "ignoreFirstShow"
		>,
		builder?: ViewBuilder,
	) {
		let b = super.getViewBuilder(preset) as ViewBuilder<UIAnimationView>;
		return b.addInitializer((view) => {
			view.createView = () => builder?.create();
		});
	}

	/** Plays the specified animation on the last output element rendered by the content view */
	async playAsync(
		animation?: RenderContext.OutputTransformer,
		repeat?: boolean,
	) {
		// prepare everything in advance
		let renderer = app.renderer;
		let output = this._lastOutput;
		if (!animation || !output || !renderer) return;

		// loop if repeating, otherwise run transform just once
		let update = this._lastUpdate;
		await Promise.resolve();
		while (this.body && this._lastUpdate === update) {
			// use a promise to avoid a blocking infinite loop
			let minRepeatPromise = repeat
				? new Promise((r) => setTimeout(r, MIN_REPEAT_MS))
				: undefined;
			await renderer.animateAsync(output, animation);
			if (!repeat) return;
			await minRepeatPromise;
		}
	}

	override render(callback: RenderContext.RenderCallback) {
		if (callback) {
			let orig = callback;
			let result: RenderContext.RenderCallback = (callback = (
				output,
				afterRender,
			) => {
				let hiding = this._lastOutput && !output;
				let showing = !this._lastOutput && output;
				if (this.hideAnimation && hiding) {
					// removed output: play 'hide' animation, *then* update
					let updateId = _nextUpdateId++;
					this._lastUpdate = updateId;
					this.playAsync(this.hideAnimation)
						.catch(errorHandler)
						.then(() => {
							if (this._lastUpdate === updateId) {
								orig = orig(output, afterRender);
							}
						});
					this._lastOutput = undefined;
				} else {
					this._lastOutput = output;
					this._lastUpdate = _nextUpdateId++;
					if (showing && (this._shown || !this.ignoreFirstShow)) {
						// new output: play 'show' animation or clear
						if (this.showAnimation) {
							this.playAsync(this.showAnimation).catch(errorHandler);
						} else if (output) {
							this.playAsync({ async applyTransform(_) {} });
						}
					}
					orig = orig(output, afterRender);

					// after showing output, play 'repeat' animation
					if (this.repeatAnimation) {
						this.playAsync(this.repeatAnimation, true);
					}
				}
				if (showing) this._shown = true;
				return result;
			});
		}
		return super.render(callback);
	}

	/** Animation that will be played automatically when the content view is shown */
	showAnimation?: RenderContext.OutputTransformer;

	/** Animation that will be played when the content view is hidden (through `UIRenderable.hidden` property or `UIConditionalView`) */
	hideAnimation?: RenderContext.OutputTransformer;

	/** Animation that will be played repeatedly after the content view is shown */
	repeatAnimation?: RenderContext.OutputTransformer;

	/** True if first appearance should not be animated */
	ignoreFirstShow?: boolean;

	private _lastOutput?: RenderContext.Output;
	private _lastUpdate?: number;
	private _shown?: boolean;
}
