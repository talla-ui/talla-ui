import { app, RenderContext } from "talla";

const DATA_UID = "web-handler__animating";
const DATA_REDUCE_MOTION = "web-handler__anim0";
let _nextUid = 1;

/** @internal Helper function to shortcut all animations on a specific element */
export function reduceElementMotion(element: HTMLElement) {
	element.dataset[DATA_REDUCE_MOTION] = "true";
}

/** @internal A DOM implementation of the `OutputTransform` interface */
export class WebOutputTransform implements RenderContext.OutputTransform {
	constructor(out: RenderContext.Output, prev?: WebOutputTransform) {
		this._out = out;
		let elt = out.element as HTMLElement;
		let uid = "_" + _nextUid++;
		if (prev) {
			this._origin = prev._origin;
			this._reducedMotion = prev._reducedMotion;
		}
		if (elt.dataset[DATA_REDUCE_MOTION]) {
			this._reducedMotion = true;
		}

		// prepare a promise for async callbacks
		let resolve: (result: boolean) => void;
		this._p = new Promise((r) => {
			resolve = r;
		});

		// handlers that are invoked when ended or canceled by DOM
		let endHandler = () => resolve(removeHandlers(true));
		let cancelHandler = () => resolve(removeHandlers(false));
		let addHandlers = () => {
			elt.removeEventListener("transitionstart", addHandlers);
			elt.addEventListener("transitionend", endHandler);
			elt.addEventListener("transitioncancel", cancelHandler);
		};
		let removeHandlers = (result: boolean) => {
			if (!elt) return false;
			if (elt.dataset[DATA_UID] === uid) delete elt.dataset[DATA_UID];
			elt.removeEventListener("transitionend", endHandler);
			elt.removeEventListener("transitioncancel", cancelHandler);
			return result;
		};

		// use an async recursive function to set transform/transition
		let startT = 0;
		let applied = false;
		let checkStart = () => {
			if (!elt || !app.renderer) return cancelHandler();

			// try to apply now
			if (!applied) {
				// if another transform is running, cancel now
				if (elt.dataset[DATA_UID]) return cancelHandler();
				applied = this._apply(elt);
				if (applied && this._waiting) {
					// make sure another transform doesn't start
					elt.dataset[DATA_UID] = uid;
				}
			}

			// set DOM handlers and timeout if needed
			if (!startT) {
				startT = Date.now();
				setTimeout(
					() => {
						resolve(removeHandlers(applied));
					},
					this._delay + this._duration + 200,
				);
				if (this._duration) {
					elt.addEventListener("transitionstart", addHandlers);
				}
			}

			// retry (within 1s) or cancel if element is not in DOM yet
			if (!document.body?.contains(elt)) {
				if (startT < Date.now() - 1000) {
					return applied ? endHandler() : cancelHandler();
				}
				setTimeout(checkStart, 1);
				return;
			}

			// if no transition duration (but element appeared),
			// schedule resolution during the next frame
			if (applied && this._waiting && !this._duration) {
				let renderer = app.renderer;
				requestAnimationFrame(() => {
					renderer.schedule(endHandler);
				});
			}
		};

		// start asynchronously, and wait for next frame if stepping
		if (prev) {
			prev.waitAsync().then((result) => {
				if (!result || !app.renderer) return resolve(false);
				checkStart();
			});
		} else {
			Promise.resolve(true).then(checkStart);
		}
	}

	getOutput() {
		return this._out;
	}

	waitAsync(): Promise<boolean> {
		this._waiting = true;
		return this._p;
	}

	step() {
		return new WebOutputTransform(this._out, this);
	}

	smoothOffset() {
		// store current position
		let elt = this._out.element as HTMLElement;
		let rect = elt && elt.getBoundingClientRect();
		if (!rect || (!rect.width && !rect.height)) return this;

		// use update method to reverse position later
		this._update = (elt) => {
			elt.style.transition = "";
			elt.style.transform = "";
			let newRect = elt.getBoundingClientRect();
			this.offset(
				(rect.x - newRect.x) / (newRect.width || 1),
				(rect.y - newRect.y) / (newRect.height || 1),
			);
			return true;
		};
		return this.step().offset(0, 0);
	}

	delay(ms: number) {
		this._delay = ms;
		return this;
	}

	linear(ms: number) {
		this._timingFunction = "linear";
		this._duration = this._reducedMotion ? 0 : ms;
		return this;
	}

	ease(ms: number) {
		return this.timing(ms, [0.25, 0.1, 0.25, 1]);
	}

	easeIn(ms: number) {
		return this.timing(ms, [0.42, 0, 1, 1]);
	}

	easeOut(ms: number) {
		return this.timing(ms, [0, 0, 0.58, 1]);
	}

	timing(ms: number, values: [number, number, number, number]) {
		this._timingFunction = "cubic-bezier(" + values.join(",") + ")";
		this._duration = this._reducedMotion ? 0 : ms;
		return this;
	}

	origin(x: number, y: number) {
		this._origin = [x, y];
		return this;
	}

	offset(x = 0, y = x) {
		this._transform.unshift("translate(" + x * 100 + "%," + y * 100 + "%)");
		return this;
	}

	scale(x = 1, y = x) {
		this._transform.unshift("scale(" + +x + "," + +y + ")");
		return this;
	}

	skew(xDeg = 0, yDeg = 0) {
		this._transform.unshift("skew(" + +xDeg + "deg," + +yDeg + "deg)");
		return this;
	}

	rotate(deg: number) {
		this._transform.unshift("rotate(" + +deg + "deg)");
		return this;
	}

	align(
		ref?: RenderContext.Output<unknown>,
		origin: [number, number] = [0.5, 0.5],
		refOrigin: [number, number] = [0.5, 0.5],
		scaleX?: number | undefined,
		scaleY?: number | undefined,
	) {
		if (!this._origin) this._origin = origin;
		let updated = false;
		this._update = (elt: HTMLElement) => {
			let refElt = (ref && ref.element) as HTMLElement | undefined;
			if (updated || !refElt || !document.body.contains(elt)) return updated;
			updated = true;

			// get both rectangles to work out the difference
			let rect = elt.getBoundingClientRect();
			let refRect = refElt.getBoundingClientRect();

			// find reference points (depending on origins)
			let rectX = rect.x + origin[0] * rect.width;
			let rectY = rect.y + origin[1] * rect.height;
			let refX = refRect.x + refOrigin[0] * refRect.width;
			let refY = refRect.y + refOrigin[1] * refRect.height;

			// adjust scale according to reference element
			if (scaleX != null && rect.width > 0) {
				this.scale((refRect.width / rect.width) * scaleX);
			}
			if (scaleY != null && rect.height > 0) {
				this.scale(undefined, (refRect.height / rect.height) * scaleY);
			}

			// adjust offset based on difference
			this.offset(
				rect.width > 0 ? (refX - rectX) / rect.width : 0,
				rect.height > 0 ? (refY - rectY) / rect.height : 0,
			);
			return true;
		};
		return this;
	}

	fade(opacity: number) {
		this._filter.push("opacity(" + +opacity + ")");
		return this;
	}

	blur(strength: number) {
		this._filter.push("blur(" + +strength + "px)");
		return this;
	}

	saturate(saturation: number) {
		this._filter.push("saturate(" + +saturation + ")");
		return this;
	}

	reduceMotion() {
		this._reducedMotion = true;
	}

	private _apply(elt: HTMLElement) {
		if (this._update && !this._update(elt)) return false;
		elt.style.willChange = "transform,filter";
		if (!this._duration || elt.dataset[DATA_REDUCE_MOTION]) {
			elt.style.transition = "";
		} else {
			let transition =
				this._duration + "ms " + (this._timingFunction || "linear");
			if (this._delay) transition += " " + this._delay + "ms";
			elt.style.transition =
				"transform " + transition + ", filter " + transition;
		}
		elt.style.filter = this._filter.join(" ") || "none";
		elt.style.transform = this._transform.join(" ") || "none";
		elt.style.transformOrigin = this._origin
			? this._origin.map((n) => n * 100 + "%").join(" ")
			: "";
		return true;
	}

	private _out: RenderContext.Output;
	private _origin?: [number, number];
	private _transform: string[] = [];
	private _filter: string[] = [];
	private _delay = 0;
	private _duration = 0;
	private _timingFunction?: string;
	private _update?: (elt: HTMLElement) => boolean;
	private _p: Promise<boolean>;
	private _waiting?: boolean;
	private _reducedMotion?: boolean;
}
