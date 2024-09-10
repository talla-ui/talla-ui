import "./tests/skip.js";
import "./tests/assertions.js";
import "./tests/count.js";
import "./tests/nesting.js";
import "./tests/async.js";
import "./tests/app.js";

import { runTestsAsync, formatTestResults } from "../dist/index.js";
// ... from "@talla-ui/test-handler"

let details = await runTestsAsync();
console.log(formatTestResults(details));
if (details.failed) process.exit(1);
