import { formatTestResults, runTestsAsync } from "@desk-framework/frame-test";
import * as fs from "fs/promises";

// import tests to run `describe` functions
import "./tests/base/index.js";
import "./tests/app/index.js";
import "./tests/ui/index.js";

console.log("Running tests...");
let details = await runTestsAsync();
console.log(formatTestResults(details));

await fs.writeFile(
	"test.log",
	details.results
		.filter((r) => r.state !== "wait")
		.map(
			(r) =>
				`[${r.state}] ${r.name}` +
				(r.logs ? "\n" + r.logs : "") +
				(r.stack ? "\n---\n" + r.stack : ""),
		)
		.join("\n\n"),
);

if (details.failed) process.exit(1);
