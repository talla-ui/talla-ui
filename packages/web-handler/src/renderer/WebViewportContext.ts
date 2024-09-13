import { ManagedObject, RenderContext, app } from "talla";
import type { WebContextOptions } from "../WebContext.js";
import {
	getWindowInnerHeight,
	getWindowInnerWidth,
} from "../style/DOMStyle.js";

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

	setGridSize(colSize: number, rowSize: number) {
		this._colSize = colSize;
		this._rowSize = rowSize;
		this.update();
	}

	/** Measure the current viewport and update context properties */
	update() {
		let w = getWindowInnerWidth();
		let h = getWindowInnerHeight();
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
		return this;
	}

	private _addHandler() {
		if (_handlerAdded) return;
		_handlerAdded = true;
		function update() {
			if (app.renderer?.viewport instanceof WebViewportContext) {
				app.renderer.viewport.update();
			}
			return false;
		}
		window.addEventListener("resize", update);
		setInterval(update, 800);
	}

	private _colSize = 300;
	private _rowSize = 300;
}
