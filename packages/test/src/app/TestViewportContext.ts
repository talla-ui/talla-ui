import { ManagedObject, ViewportContext } from "desk-frame";

// TODO(feature): make this do something interesting, use options to set w/h

/** @internal */
export class TestViewportContext
	extends ManagedObject
	implements ViewportContext
{
	height?: number;
	width?: number;
	portrait = false;
	narrow = false;
	wide = false;
	short = false;
	tall = false;
	setBreakpoints() {
		// do nothing
	}
}
