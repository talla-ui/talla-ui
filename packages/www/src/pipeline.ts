import type { Pipeline } from "markdown-pipeline";
import * as pagerefblock from "./transforms/pagerefblock.js";
import * as template from "./transforms/template.js";
import * as iframesample from "./transforms/iframesample.js";
import * as tabstospaces from "./transforms/tabstospaces";
import * as abstract from "./transforms/abstract.js";
import * as breadcrumb from "./transforms/breadcrumb.js";
import * as timestamp from "./transforms/timestamp.js";
import * as pipeline_en from "./en/pipeline.js";

export function start(pipeline: Pipeline) {
	pipeline.setParserOptions({ smartypants: true });
	tabstospaces.start(pipeline);
	template.start(pipeline);
	iframesample.start(pipeline);
	abstract.start(pipeline);
	breadcrumb.start(pipeline);
	timestamp.start(pipeline);
	pagerefblock.start(pipeline);

	// Add English content
	pipeline_en.start(pipeline);
}
