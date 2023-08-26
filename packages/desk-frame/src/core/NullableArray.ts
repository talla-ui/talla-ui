/** @internal Type of array that has null gaps, used with `removeFromNullableArray()` */
export type NullableArray<T> = Array<T | null>;

/** @internal Helper function to remove a value from a NullableArray in the most performant way */
export function removeFromNullableArray<T>(a: NullableArray<T>, v: T) {
	const len = a !== undefined ? a.length : 0;
	if (len === 0) return;
	if (len === 1 && a[0] === v) {
		// single element, just remove it
		a.length = 0;
	} else if (len === 2) {
		if (a[0] === v) {
			// take second element only
			a[0] = a[1]!;
		}
		// take first element only
		a.length = 1;
	} else if (len < 16) {
		// replace element with a null value, much faster
		for (let i = len; i > 0; ) {
			if (a[--i] === v) {
				a[i] = null;
				break;
			}
		}
	} else {
		// remove element and all nulls on the way (slowest, copy)
		let j = 0;
		for (let i = 0; i < len; i++) {
			let cur = a[i];
			if (cur === null || cur === v) continue;
			if (i !== j) a[j] = cur!;
			j++;
		}
		a.length = j;
	}
}
