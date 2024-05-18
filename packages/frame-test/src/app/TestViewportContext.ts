import { ManagedObject, ViewportContext } from "@desk-framework/frame-core";

// TODO(feature): make this do something interesting, use options to set grid

/** @internal */
export class TestViewportContext
	extends ManagedObject
	implements ViewportContext
{
	height?: number;
	width?: number;
	portrait = false;
	col2 = false;
	col3 = false;
	col4 = false;
	col5 = false;
	row2 = false;
	row3 = false;
	row4 = false;
	row5 = false;
	setGridSize(colSize: number, rowSize: number): void {
		// do nothing
	}
}
