import { runTestsAsync, formatTestResults } from "@desk-framework/frame-test";

setTimeout(async () => {
	try {
		let results = await runTestsAsync();
		let output = formatTestResults(results);
		console.log(output);
		if (results.failed) process.exit(1);
	} catch (e) {
		console.error(e);
		process.exit(1);
	}
}, 1);
