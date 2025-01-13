import { ManagedList, ManagedObject } from "@talla-ui/core";
import { TestCase } from "./TestCase.js";

const MAX_LOGS = 100;
const MAX_ARRAYLEN = 15;
const MAX_PROPS = 15;
const MAX_STRLEN = 80;
const MAX_NEST_DETAIL = 2;

/** @internal Helper function to turn value into string for log messages */
export function val2str(value: any, nest = 0, seen: any[] = []): string {
	nest++;
	if (seen.includes(value)) return "<<circular>>";
	if (
		value == null ||
		value === true ||
		value === false ||
		(typeof value === "number" && isNaN(value))
	) {
		// return value name
		return String(value);
	}
	if (typeof value === "function") {
		let type = String(value).startsWith("class") ? "class" : "function";
		return `<<${type} ${value.name}>>`;
	}
	if (value instanceof RegExp) {
		return "/" + value.source + "/" + value.flags;
	}
	if (Array.isArray(value)) {
		// return array representation with max elements
		if (nest > MAX_NEST_DETAIL) {
			return value.length ? "[..." + value.length + "]" : "[]";
		}
		return (
			"[" +
			value
				.slice(0, MAX_ARRAYLEN)
				.map((v) => val2str(v, nest, [...seen, value]))
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
		if (value.isUnlinked()) return "unlinked:" + result;
		result += "[";
		if (nest > MAX_NEST_DETAIL) {
			return result + (value.count ? "..." + value.count + "]" : "[]");
		}
		let n = 0;
		for (let elt of value) {
			if (n >= MAX_ARRAYLEN) {
				result += ", ...(count: " + value.count + ")";
				break;
			}
			result += (n++ ? ", " : "") + val2str(elt, nest, [...seen, value]);
		}
		return result + "]";
	}
	if (value instanceof Date) {
		// return date value as text
		return "Date(" + value + ")";
	}
	if (typeof value === "object") {
		// return object representation with max properties
		let proto = Object.getPrototypeOf(value);
		let name = proto?.constructor?.name;
		let result =
			nest > MAX_NEST_DETAIL || (name && name !== "Object")
				? "<" + name + ">"
				: "";
		if (value instanceof ManagedObject && value.isUnlinked())
			result = "unlinked:" + result;
		if (nest <= MAX_NEST_DETAIL) {
			let keys = Object.keys(value);
			result +=
				"{" +
				keys
					.slice(0, MAX_PROPS)
					.map(
						(k) =>
							" " +
							JSON.stringify(k) +
							": " +
							val2str(value[k], nest, [...seen, value]),
					)
					.join(", ") +
				(keys.length > MAX_PROPS ? ", ...+" + (keys.length - MAX_PROPS) : "") +
				(keys.length > 0 ? " " : "") +
				"}";
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
