/** @internal Reference to error handler, set by app context; this variable is used to break circular dependencies */
export let errorHandler: (err: any) => void = (err) => {
	console.error(err);
};

/** @internal Update the error handler referenced by `errorHandler` (called by app context) */
export function setErrorHandler(handler: (err: any) => void) {
	errorHandler = handler;
}

/** @internal Call the provided function, catching errors and handling Promise rejections */
export function safeCall<T, A extends any[], R>(
	fn: (this: T, ...args: A) => R,
	thisArg?: T,
	...args: A
): R | void {
	try {
		let result: any = fn.call(thisArg!, ...args);
		if (result && typeof result.catch === "function") {
			result.catch(errorHandler);
		}
		return result;
	} catch (err) {
		errorHandler(err);
	}
}

/** @internal Helper function to create an error object with a predefined message (indexed by {@link ERROR}) and an optional parameter */
export function err(error: ERROR, s?: any) {
	return Error((messages[error] || "Unknown error") + (s ? ": " + s : ""));
}

/** @internal Helper function to create an error object for an invalid argument */
export function invalidArgErr(name: string) {
	return Error("Invalid argument: " + name);
}

/** @internal Error types used with `err()` */
export const enum ERROR {
	Object_Unlinked,
	Object_NoAttach,
	Object_NoObserve,
	List_AttachState,
	List_Restriction,
	List_Duplicate,
	Service_NotFound,
	Activity_NotFound,
	Activity_Cancelled,
	Activity_NotAttached,
	Render_Unavailable,
	View_Invalid,
	View_NotAttached,
	UIViewElement_NoRenderer,
	UIList_Invalid,
}

const messages = [
	"Object already unlinked",
	"Object cannot be attached",
	"Property not observable",
	"Cannot change attached state",
	"Unmatched object restriction",
	"Duplicate object",
	"Service not found",
	"Activity not found",
	"Activity transition cancelled",
	"Activity is not attached",
	"No renderer available",
	"Invalid body view type",
	"View is not attached",
	"No renderer for this UI element",
	"Invalid list type",
] as const;
