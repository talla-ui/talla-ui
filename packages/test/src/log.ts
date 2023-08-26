import { ManagedList, ManagedMap, ManagedObject } from "desk-frame";
import { TestCase } from "./TestCase.js";

const MAX_LOGS = 100;
const MAX_ARRAYLEN = 15;
const MAX_PROPS = 15;
const MAX_STRLEN = 80;

/** @internal Helper function to turn value into string for log messages */
export function val2str(value: any, lowDetail?: boolean): string {
	if (
		value == null ||
		value === true ||
		value === false ||
		(typeof value === "number" && isNaN(value))
	) {
		// return value name
		return String(value);
	}
	if (value instanceof RegExp) {
		return "/" + value.source + "/" + value.flags;
	}
	if (Array.isArray(value)) {
		// return array representation with max elements
		if (lowDetail) return value.length ? "[..." + value.length + "]" : "[]";
		return (
			"[" +
			value
				.slice(0, MAX_ARRAYLEN)
				.map((v) => val2str(v, true))
				.join(", ") +
			(value.length > MAX_ARRAYLEN
				? ", ...(length: " + value.length + ")"
				: "") +
			"]"
		);
	}
	if (value instanceof ManagedList) {
		// return list of elements for managed list
		let name = Object.getPrototypeOf(value)?.constructor?.name;
		let result = `[[${name}]]`;
		if (value.isUnlinked()) return result + "<unlinked>";
		result += "[";
		if (lowDetail)
			return result + (value.count ? "..." + value.count + "]" : "[]");
		let n = 0;
		for (let elt of value) {
			if (n >= MAX_ARRAYLEN) {
				result += ", ...(count: " + value.count + ")";
				break;
			}
			result += (n++ ? ", " : "") + val2str(elt, true);
		}
		return result + "]";
	}
	if (value instanceof ManagedMap) {
		// return count for managed map
		let name = Object.getPrototypeOf(value)?.constructor?.name;
		let result = `[[${name}]]`;
		if (value.isUnlinked()) return result + "<unlinked>";
		return result + (value.count ? "{...count: " + value.count + "}" : "{}");
	}
	if (value instanceof Date) {
		// return date value as text
		return "Date(" + value + ")";
	}
	if (typeof value === "function") {
		// return function code (trimmed)
		let str = String(value);
		return (
			"Function(" + str.slice(0, 20) + (str.length > 20 ? "..." : "") + ")"
		);
	}
	if (typeof value === "object") {
		// return object representation with max properties
		let proto = Object.getPrototypeOf(value);
		let name = proto?.constructor?.name;
		let result =
			lowDetail || (name && name !== "Object") ? "[[" + name + "]]" : "";
		if (value instanceof ManagedObject && value.isUnlinked())
			result += "<unlinked>";
		if (!lowDetail) {
			let keys = Object.keys(value);
			result +=
				"{ " +
				keys
					.slice(0, MAX_PROPS)
					.map((k) => JSON.stringify(k) + ": " + val2str(value[k], true))
					.join(", ") +
				(keys.length > MAX_PROPS ? ", ...+" + (keys.length - MAX_PROPS) : "") +
				" }";
		}
		return result;
	}
	if (typeof value === "symbol") {
		return String(value);
	}

	// return JSON value (for strings, numbers, etc.)
	let result = JSON.stringify(value);
	if (result && result.length > MAX_STRLEN)
		result = result.slice(0, MAX_STRLEN - 2) + "...";
	return result;
}

/** @internal Helper function to get test log output as a string */
export function testLogsToString(test: TestCase) {
	let result = "";
	let logs = test.getLogs();
	if (logs.length > MAX_LOGS) {
		result += "... (" + (logs.length - MAX_LOGS) + ")";
	}
	for (let log of logs.slice(-MAX_LOGS)) {
		result += (result ? "\n" : "") + log.join(" ");
	}
	return result;
}
