/** @internal Reference to error handler, set by app context; this variable is used to break circular dependencies */
export let errorHandler: (err: any) => void = () => {};

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
	Format_Invalid,
	Format_Type,
	Activity_Cancelled,
	Activity_NotAttached,
	Render_Unavailable,
	Render_NoModal,
	View_Invalid,
	View_NotAttached,
	UIComponent_NoRenderer,
	UIList_Invalid,
	JSX_InvalidTag,
}

const messages = [
	"Object already unlinked",
	"Object cannot be attached",
	"Property not observable",
	"Cannot change attached state",
	"Unmatched object restriction",
	"Duplicate object",
	"Invalid format result",
	"Invalid format type",
	"Activity transition cancelled",
	"Activity is not attached",
	"No renderer available",
	"No modal controller available",
	"Invalid body view type",
	"View is not attached",
	"No renderer for this component",
	"Invalid list type",
	"Invalid JSX tag",
] as const;
