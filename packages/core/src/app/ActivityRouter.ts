import { invalidArgErr } from "../errors.js";
import { ObservableList, ObservableObject } from "../object/index.js";
import { Activity } from "./Activity.js";

/** @internal A registered route entry in the route table */
interface RouteEntry {
	pattern: string;
	segments: string[];
	wildcard?: boolean;
	args: ActivityRouter.RouteArg<any>[];
}

/** @internal A route together with the matched parameters for a path */
interface RouteMatch {
	route: RouteEntry;
	params: Record<string, string>;
}

/** @internal Resolved activities for a route match */
interface ResolvedRoute {
	newActive: Set<Activity>;
	newFactoryCreated: Set<Activity>;
}

/**
 * A class that manages activation and deactivation of activities, with support for path-based routing
 *
 * Activities can be added using {@link add()} for manual management, or registered with a route pattern using {@link route()}. Route-registered activities are automatically activated and deactivated based on navigation path changes. However, routes are normally managed in one go using {@link AppContext.addRoutes app.addRoutes()}.
 *
 * A single instance of this class is available as {@link AppContext.activities app.activities}, which can be used to read (or bind to) the current set of activated activities or route parameters.
 */
export class ActivityRouter extends ObservableObject {
	/** Creates a new activity router */
	constructor() {
		super();

		// attach the activities list, for activities added by reference (not factory-created)
		this._activities = this.attach(
			new ObservableList<Activity>().attachItems(true),
			(e) => {
				if (e.source === this._activities) {
					this.emitChange();
					return;
				}
				if (
					e.name === "Active" &&
					this._activities.includes(e.source as Activity)
				) {
					this.emitChange();
				}
			},
		);
	}

	/**
	 * The list of currently active route-matched activities
	 * - This list contains references to activities that were activated by the most recent route match. It does not include activities added via {@link add()} (those are managed manually).
	 * - Observe or bind to this list to react to route changes, e.g. to detect the presence of a detail activity in a list-detail view.
	 */
	readonly active = new ObservableList<Activity>();

	/**
	 * The current route parameters
	 * - After matching a route pattern with parameters (e.g. `users/:userId`), the activity router makes the extracted parameter values available as properties on this object.
	 * - This object is replaced on each route match (not mutated).
	 * - For wildcard routes, the remaining path is captured as the `path` property (may be an empty string when the path `/` is matched as `*`).
	 */
	params: Record<string, string> = {};

	/**
	 * The route pattern that matched most recently
	 * - This is the normalized route pattern string used internally for matching.
	 * - Wildcard routes include a trailing `/*`, while the catch-all route is exposed as `*`.
	 * - This value is empty when no route matched.
	 */
	matchedRoute = "";

	/** Returns true if the router does not have any registered activities or routes */
	isEmpty() {
		return this._activities.length === 0 && this._routes.length === 0;
	}

	/**
	 * Adds an activity to this router
	 * - The activity is added and attached to this router, but never automatically activated or deactivated by route changes. Use this for activities that are managed manually.
	 * - If the activity unlinks itself, it's automatically removed from the list.
	 * @param activity The activity to be added
	 * @param activate True if the activity should be activated immediately
	 */
	add(activity: Activity, activate?: boolean) {
		this._activities.add(activity);
		if (activate) activity.activate();
		return this;
	}

	/**
	 * Registers a route pattern with one or more activities or factory functions
	 * - When the navigation path matches the pattern, all provided activities are activated and added to the {@link active} list.
	 * - When the path no longer matches, activities are deactivated. Activities passed by reference remain attached; factory-created activities are removed (and unlinked).
	 * - Pattern segments starting with `:` are treated as parameters (e.g. `users/:userId`).
	 * - A `*` segment at the end matches any remaining path segments; the matched portion is available as the `path` parameter. A bare `*` matches any path including the root, with `path` set to an empty string when no segments remain.
	 * - Factory functions receive the extracted parameters as an argument and may return an Activity instance, or undefined. Returning no activity skips activation for that route arg. If a factory throws, the error propagates to the global error handler.
	 * - Routes are matched in registration order (first match wins). Register more specific patterns before general ones.
	 * @param pattern The route pattern to match (e.g. `"users/:userId"`)
	 * @param args One or more Activity instances or factory functions
	 * @error Throws if the pattern is invalid (leading/trailing slashes, empty segments, dots, bare `:`, or `*` not at end)
	 */
	route<P extends string>(pattern: P, ...args: ActivityRouter.RouteArg<P>[]) {
		if (!args.length) throw invalidArgErr("args");
		let parsed = this._parseRoutePattern(pattern);
		this._routes.push({
			pattern,
			segments: parsed.segments,
			wildcard: parsed.wildcard,
			args: args as any,
		});

		// attach all activities passed by reference
		for (let arg of args) {
			if (arg instanceof Activity && !this._activities.includes(arg)) {
				this._activities.add(arg);
			}
		}
		return this;
	}

	/** Removes all activities and route registrations */
	clear() {
		this._activities.clear();
		this.active.clear();
		this._routes.length = 0;
		this._factoryCreated.clear();
		this.params = {};
		this.matchedRoute = "";
		this._navIdx++;
		return this;
	}

	/**
	 * Routes to matching activities for the given path
	 * - This method matches the path against registered route patterns (first match wins). It computes the diff between the current and new active sets, deactivating removed activities and activating new ones.
	 * - Activities that appear in both the old and new active sets are not deactivated or reactivated.
	 * - Concurrent calls are safe, only the most recent route takes effect.
	 * @param path The path for which to activate matching activities.
	 */
	async routeAsync(path: string): Promise<Activity | undefined> {
		if (this.isUnlinked()) return;

		// claim the current navigation attempt before publishing route state
		let navIdx = ++this._navIdx;

		// find the first matching route, then publish its state only if still current
		let match = this._findRouteMatch(path);
		if (navIdx !== this._navIdx || this.isUnlinked()) return;
		this.params = match?.params || {};
		this.matchedRoute = match?.route.pattern || "";

		// resolve the next route state and compute the activation diff
		let resolved = this._resolveRoute(match);
		let toDeactivate = this.active.filter(
			(activity) => !resolved.newActive.has(activity),
		);
		let toActivate = [...resolved.newActive].filter(
			(activity) => !this.active.includes(activity),
		);

		// deactivate anything that no longer belongs to the route
		if (!this._deactivateRemoved(toDeactivate, navIdx)) return;
		if (navIdx !== this._navIdx || this.isUnlinked()) return;

		// commit the new active set and attach any newly owned activities
		this.active.replaceAll(resolved.newActive);
		this._attachFactoryCreated(toActivate, resolved.newFactoryCreated);

		// activate newly added activities and return the primary result
		let first = this._activateAdded(toActivate, navIdx);
		return first || resolved.newActive.values().next().value;
	}

	/** Finds the first route that matches the given path */
	private _findRouteMatch(path: string): RouteMatch | undefined {
		let pathSegments = path ? path.split("/") : [];
		for (let route of this._routes) {
			if (!this._hasMatchingLength(pathSegments, route)) continue;
			let params = this._extractParams(pathSegments, route.segments);
			if (!params) continue;
			if (route.wildcard) {
				params.path = pathSegments.slice(route.segments.length).join("/");
			}
			return { route, params };
		}
	}

	/** Resolves a route match into the next active activities and factory-created ownership set */
	private _resolveRoute(match?: RouteMatch): ResolvedRoute {
		let newActive = new Set<Activity>();
		let newFactoryCreated = new Set<Activity>();
		if (!match) return { newActive, newFactoryCreated };

		for (let arg of match.route.args) {
			if (arg instanceof Activity) {
				newActive.add(arg);
				continue;
			}

			let activity = arg(match.params);
			if (!activity) continue;

			newActive.add(activity);
			if (!this._activities.includes(activity)) {
				newFactoryCreated.add(activity);
			}
		}

		return { newActive, newFactoryCreated };
	}

	/** Deactivates removed activities and unlinks any factory-created ones that are no longer active */
	private _deactivateRemoved(toDeactivate: Activity[], navIdx: number) {
		for (let activity of toDeactivate) {
			if (navIdx !== this._navIdx || this.isUnlinked()) return false;
			if (activity.isActive()) activity.deactivate();
			if (this._factoryCreated.has(activity)) {
				this._factoryCreated.delete(activity);
				this._activities.remove(activity);
			}
		}
		return true;
	}

	/** Attaches newly activated factory-created activities to the router */
	private _attachFactoryCreated(
		toActivate: Activity[],
		newFactoryCreated: Set<Activity>,
	) {
		for (let activity of toActivate) {
			if (!newFactoryCreated.has(activity)) continue;
			this._factoryCreated.add(activity);
			this._activities.add(activity);
		}
	}

	/** Activates newly added activities and returns the first one that was activated */
	private _activateAdded(toActivate: Activity[], navIdx: number) {
		let first: Activity | undefined;
		for (let activity of toActivate) {
			if (navIdx !== this._navIdx || this.isUnlinked()) return;
			if (!activity.isUnlinked() && !activity.isActive()) {
				activity.activate();
				if (!first) first = activity;
			}
		}
		return first;
	}

	/** Parses and validates a route pattern into route segments and wildcard metadata */
	private _parseRoutePattern(pattern: string) {
		let segments = pattern ? pattern.split("/") : [];
		if (/^\/|\/\/|\/$/g.test(pattern)) throw invalidArgErr("pattern");
		for (let len = segments.length, i = len - 1; i >= 0; i--) {
			let segment = segments[i];
			if (!segment || /^\./.test(segment)) throw invalidArgErr("pattern");
			if (
				(segment === "*" && i !== len - 1) ||
				(segment.startsWith(":") && segment.length < 2)
			) {
				throw invalidArgErr("pattern");
			}
		}
		let wildcard = segments[segments.length - 1] === "*";
		if (wildcard) segments = segments.slice(0, -1);
		return { segments, wildcard };
	}

	/** Checks whether the path segment count can match the route, including wildcard rules */
	private _hasMatchingLength(pathSegments: string[], route: RouteEntry) {
		if (!route.wildcard) return pathSegments.length === route.segments.length;
		return (
			route.segments.length === 0 || pathSegments.length > route.segments.length
		);
	}

	/** Extracts route parameters from aligned path and route segments, or returns undefined when a segment does not match */
	private _extractParams(pathSegments: string[], routeSegments: string[]) {
		let params: Record<string, string> = {};
		for (let i = 0; i < routeSegments.length; i++) {
			let seg = routeSegments[i]!;
			let val = pathSegments[i]!;
			if (seg.startsWith(":")) {
				if (!val) return;
				params[seg.slice(1)] = val;
				continue;
			}
			if (seg !== val) return;
		}
		return params;
	}

	private _navIdx = 0;
	private _activities: ObservableList<Activity>;
	private _routes: RouteEntry[] = [];
	private _factoryCreated = new Set<Activity>();
}

export namespace ActivityRouter {
	/** Extracts parameter names from a route pattern string. */
	type ParamNames<T extends string> =
		T extends `${string}:${infer P}/${infer Rest}`
			? P | ParamNames<Rest>
			: T extends `${string}:${infer P}`
				? P
				: never;

	/** True if the pattern ends with a wildcard. */
	type HasWildcard<T extends string> = T extends `${string}/*`
		? true
		: T extends "*"
			? true
			: false;

	/**
	 * The parameter types extracted from a route pattern
	 * - This type is used to extract parameter names from `:param` segments and adds a `path` property for wildcard patterns.
	 * @see {@link ActivityRouter.route}
	 */
	export type RouteParams<T extends string> = {
		[K in keyof (([ParamNames<T>] extends [never]
			? {}
			: { [K in ParamNames<T>]: string }) &
			(HasWildcard<T> extends true ? { path: string } : {}))]: (([
			ParamNames<T>,
		] extends [never]
			? {}
			: { [K in ParamNames<T>]: string }) &
			(HasWildcard<T> extends true ? { path: string } : {}))[K];
	} & {};

	/**
	 * A route argument: either an Activity instance (by reference) or a factory function
	 * - Factory functions receive the extracted route parameters as their argument,
	 * typed according to the route pattern, and may return `undefined` to skip activation.
	 * @see {@link ActivityRouter.route}
	 */
	export type RouteArg<P extends string = string> =
		| Activity
		| ((params: RouteParams<P>) => Activity | undefined | void);

	/**
	 * A route table mapping patterns to one or more route arguments
	 * - Each key is a route pattern and each value is a {@link RouteArg} or array of route args.
	 * Use with {@link AppContext.addRoutes app.addRoutes()}.
	 * @see {@link AppContext.addRoutes}
	 */
	export type RouteTable = {
		[pattern: string]: RouteArg<any> | RouteArg<any>[];
	};
}
