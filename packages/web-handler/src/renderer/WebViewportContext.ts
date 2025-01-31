import { ManagedObject, RenderContext, app } from "@talla-ui/core";
import type { WebContextOptions } from "../WebContext.js";
import {
	getWindowInnerHeight,
	getWindowInnerWidth,
} from "../style/DOMStyle.js";
import { ViewportLocation } from "./WebRenderer.js";

// True if the (gloabl) WebViewportContext event handler has been added
let _handlerAdded = false;

/** @internal */
export class WebViewportContext
	extends ManagedObject
	implements RenderContext.Viewport
{
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
	col2 = false;
	col3 = false;
	col4 = false;
	col5 = false;
	row2 = false;
	row3 = false;
	row4 = false;
	row5 = false;
	prefersDark?: boolean = undefined;

	setGridSize(colSize: number, rowSize: number) {
		this._colSize = colSize;
		this._rowSize = rowSize;
		this._updateSize();
	}

	/** Take the specified overrides into account */
	setLocationOverride(override?: ViewportLocation) {
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
			let gw = Math.floor(w / this._colSize);
			let gh = Math.floor(h / this._rowSize);
			this.col2 = gw >= 2;
			this.col3 = gw >= 3;
			this.col4 = gw >= 4;
			this.col5 = gw >= 5;
			this.row2 = gh >= 2;
			this.row3 = gh >= 3;
			this.row4 = gh >= 4;
			this.row5 = gh >= 5;
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
			if (app.renderer?.viewport instanceof WebViewportContext) {
				app.renderer.viewport._updateSize();
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
	private _override?: ViewportLocation;
}
