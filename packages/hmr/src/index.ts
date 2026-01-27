import type { Activity } from "@talla-ui/core";

/**
 * Registers an activity class for hot module replacement
 *
 * Call this function in a static block within your activity class to enable HMR.
 * When the module is hot-reloaded, methods are updated and views are re-rendered
 * while preserving activity state.
 *
 * @note This function is called automatically when using the Vite plugin.
 *
 * @param hot The HMR handle (e.g., `import.meta.hot`)
 * @param ActivityClass The activity class to register
 *
 * @example
 * export class MyActivity extends Activity {
 *   static {
 *     if (import.meta.hot) {
 *       import.meta.hot.accept();
 *       registerActivityHMR(import.meta.hot, this);
 *     }
 *   }
 *   static View = MyView;
 * }
 */
export function registerActivityHMR(
	hot: { data?: any; dispose: (cb: (data: any) => void) => void },
	ActivityClass: typeof Activity,
) {
	const PrevClass = hot.data?.ActivityClass as typeof Activity | undefined;
	const oldInstances = hot.data?.instances as Set<Activity> | undefined;
	const instanceSet = oldInstances || new Set<Activity>();
	(ActivityClass.prototype as any)._$hotInstances = instanceSet;

	hot.dispose((data) => {
		data.ActivityClass = ActivityClass;
		data.instances = instanceSet;
	});
	if (PrevClass) {
		(ActivityClass.prototype as any)._$prevClass = PrevClass;
		Promise.resolve().then(() =>
			_reloadActivityChain(PrevClass, ActivityClass),
		);
	}
}

/** Recursively update all classes in the chain, then re-render instances */
function _reloadActivityChain(Prev: typeof Activity, New: typeof Activity) {
	let prevProto = Prev.prototype as any;
	let newProto = New.prototype as any;

	// recurse first if needed
	const older = prevProto._$prevClass as typeof Activity | undefined;
	if (older) _reloadActivityChain(older, New);

	// update this class with New's prototype and View
	const desc = Object.getOwnPropertyDescriptors(newProto);
	for (let p in desc) {
		if (p === "constructor" || p === "_$prevClass") continue;
		Object.defineProperty(prevProto, p, desc[p]!);
	}
	(Prev as any).View = (New as any).View;

	// re-render views
	const instances = newProto._$hotInstances as Set<Activity> | undefined;
	if (Prev === newProto._$prevClass && instances) {
		for (const activity of instances) {
			if (!activity.isUnlinked() && activity.isActive()) {
				console.log("[HMR] Updating view: " + New.name);
				(activity as any)._showView(true);
			}
		}
	}
}
