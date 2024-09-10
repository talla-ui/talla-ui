import { TestResultsData } from "./TestResult.js";

/**
 * Returns a string-formatted version of the provided test results object, in English
 * - The test results object can be obtained using {@link getTestResults()}.
 * - Formatted results only include skipped, todo, and failed tests. It's advisable to log the full JSON data to a file as well.
 */
export function formatTestResults(results: TestResultsData): string {
	let text = "";
	text += `Tests completed in ${results.time}ms\n`;
	for (let r of results.results) {
		if (r.state === "skip") text += `- Skipped: ${r.name}\n`;
		if (r.state === "todo") text += `- To do: ${r.name}\n`;
	}
	for (let r of results.results) {
		if (r.state === "fail") {
			text += `\nERROR: ${r.name}\n`;
			if (r.logs) text += r.logs + "\n";
			if (r.error) text += r.error + "\n";
			if (r.stack) {
				let location = String(r.stack)
					.split(/[\r\n]+/)
					.filter((line) => /\.(js|jsx|ts|tsx):\d+/.test(line))
					.filter((line) => !/\/dist\//.test(line))
					.slice(0, 3)
					.join("\n");
				if (location) text += location + "\n";
			}
		}
	}
	text += results.failed ? "\n❌ FAIL" : "✅ PASS";
	if (results.totals.fail) text += ", " + results.totals.fail + " failed";
	if (results.totals.todo) text += ", " + results.totals.todo + " to do";
	if (results.totals.skip) text += ", " + results.totals.skip + " skipped";
	text += ", " + results.totals.pass + " passed.";

	return text;
}
