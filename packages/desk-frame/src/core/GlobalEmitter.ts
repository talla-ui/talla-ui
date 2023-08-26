import { ManagedObject } from "./ManagedObject.js";
import { ManagedEvent } from "./ManagedEvent.js";
import { Binding } from "./Binding.js";
import { hasTraps, $_traps_event } from "./object_util.js";

/**
 * An object that's used for emitting events
 *
 * @description
 * Instances of GlobalEmitter can be used as a way to pass messages between application components. This avoids direct dependencies between components, while reusing the existing infrastructure for events.
 *
 * In particular, emitters are used for handling errors and log messages (in {@link LogWriter}), and debugging bindings (see {@link Binding.debug()}). Applications can also use their own instances of `GlobalEmitter` to reduce direct dependencies where needed.
 */
export class GlobalEmitter<TEvent extends ManagedEvent> extends ManagedObject {
	/**
	 * Adds a (permanent) event listener
	 * @param handler A function that will be called for every event that's emitted, with the event as the only argument
	 */
	override listen(
		handler: (this: unknown, event: TEvent) => void | Promise<void>
	): this {
		return super.listen(handler as any);
	}

	/** Strongly typed version of {@link ManagedObject.emit()} */
	declare emit: {
		(name: TEvent["name"], data?: TEvent["data"]): any;
		(event: TEvent): any;
	};

	/** Returns true if any listeners or observers have been added to this emitter */
	isObserved() {
		return hasTraps(this, $_traps_event);
	}
}

// Set Binding debug emitter here; otherwise would cause circular dependency
Binding.debugEmitter = new GlobalEmitter();
