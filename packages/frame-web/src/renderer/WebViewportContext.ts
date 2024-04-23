import {
	ManagedObject,
	ViewportContext,
	app,
} from "@desk-framework/frame-core";
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
	implements ViewportContext
{
	constructor(options: WebContextOptions) {
		super();
		this._smallBreakpoint = options.smallBreakpoint;
		this._largeBreakpoint = options.largeBreakpoint;
		this._addHandler();
	}

	width?: number;
	height?: number;
	portrait = false;
	narrow = false;
	wide = false;
	short = false;
	tall = false;

	setBreakpoints(small: number, large: number) {
		this._smallBreakpoint = small;
		this._largeBreakpoint = large;
		this.update();
	}

	/** Measure the current viewport and update context properties */
	update() {
		let changed = !this.width || !this.height;
		let w = getWindowInnerWidth();
		let h = getWindowInnerHeight();
		let portrait = w < h;
		let narrow = w < this._smallBreakpoint;
		let wide = w > this._largeBreakpoint;
		let short = h < this._smallBreakpoint;
		let tall = h > this._largeBreakpoint;
		this.width = w;
		this.height = h;
		if (this.portrait !== portrait) {
			this.portrait = portrait;
			changed = true;
		}
		if (this.narrow !== narrow) {
			this.narrow = narrow;
			changed = true;
		}
		if (this.wide !== wide) {
			this.wide = wide;
			changed = true;
		}
		if (this.short !== short) {
			this.short = short;
			changed = true;
		}
		if (this.tall !== tall) {
			this.tall = tall;
			changed = true;
		}
		if (changed) this.emitChange("Resize");
	}

	private _addHandler() {
		if (_handlerAdded) return;
		_handlerAdded = true;
		function update() {
			if (app.viewport instanceof WebViewportContext) {
				app.viewport.update();
			}
			return false;
		}
		window.addEventListener("resize", update);
		setInterval(update, 800);
	}

	private _smallBreakpoint: number;
	private _largeBreakpoint: number;
}
