import { ObservableObject, Viewport, app } from "@talla-ui/core";
import { getWindowInnerHeight, getWindowInnerWidth } from "./DOMStyle.js";
import { WebContextOptions } from "./WebContextOptions.js";
import type { WebRenderer } from "./WebRenderer.js";

// True if the (gloabl) WebViewportContext event handler has been added
let _handlerAdded = false;

/** @internal */
export class WebViewport extends ObservableObject implements Viewport {
	constructor(options: WebContextOptions) {
		super();
		this._colSize = options.viewportColumnWidth;
		this._rowSize = options.viewportRowHeight;
		this._addHandler();
		this._updateColorScheme();
		this._updateSize();
	}

	width = 0;
	height = 0;
	portrait = false;
	cols = 0;
	rows = 0;
	prefersDark?: boolean = undefined;

	/** Take the specified overrides into account */
	setLocationOverride(override?: WebRenderer.ViewportLocation) {
		this._override = override;
		this._updateSize();
	}

	/** Measure the current viewport and update context properties */
	private _updateSize() {
		let w = getWindowInnerWidth();
		let h = getWindowInnerHeight();
		if (this._override) {
			let offset = { top: 0, bottom: 0, left: 0, right: 0, ...this._override };
			w -= offset.left + offset.right;
			h -= offset.top + offset.bottom;
			if (offset.width) w = offset.width;
			if (offset.height) h = offset.height;
		}
		let changed = this.width !== w || this.height !== h;
		if (changed) {
			this.width = w;
			this.height = h;
			this.portrait = w < h;
			this.cols = Math.floor(w / this._colSize);
			this.rows = Math.floor(h / this._rowSize);
			this.emitChange("Resize");
		}
	}

	/** Update the color scheme preference */
	private _updateColorScheme() {
		let m = window.matchMedia("(prefers-color-scheme: dark)");
		let dark = m.matches;
		if (this.prefersDark !== dark) {
			this.prefersDark = dark;
			this.emitChange("ColorScheme");
		}
	}

	private _addHandler() {
		if (_handlerAdded) return;
		_handlerAdded = true;
		function update() {
			if (app.viewport instanceof WebViewport) {
				app.viewport._updateSize();
			}
			return false;
		}
		window.addEventListener("resize", update);
		setInterval(update, 800);
		window
			.matchMedia("(prefers-color-scheme: dark)")
			.addEventListener("change", () => {
				this._updateColorScheme();
			});
	}

	private _colSize = 300;
	private _rowSize = 300;
	private _override?: WebRenderer.ViewportLocation;
}
