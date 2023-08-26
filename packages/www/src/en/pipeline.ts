import * as path from "path";
import { glob } from "glob";
import type { Pipeline } from "markdown-pipeline";
import * as navbar from "../transforms/navbar.js";
import * as docgen from "../docgen/pipeline.js";
import { PackageDocs } from "../docgen/PackageDocs.js";
import config from "../../content/en/config.json";

function getGuidePaths(pipeline: Pipeline) {
	let basePath = path.resolve(pipeline.path);
	return glob.sync("**/*.md", { cwd: basePath });
}

export function start(pipeline: Pipeline) {
	// Map EN root content to root path, and add home page
	pipeline.spawn("content/en", "./").addFiles("index.md");

	// Map EN docs to /en/docs
	pipeline.spawn("content/en/docs", "en/docs", (docPipeline) => {
		// add navbar tag for entire docs pipeline
		navbar.start(docPipeline, config.navbar);

		// Add main API docs and guides
		let mainApiDocs: PackageDocs;
		docPipeline.spawn("main", "main", (mainPipeline) => {
			docgen.start(
				mainPipeline,
				{
					dtsPath: "../../../../node_modules/desk-frame/dist/**/*.d.ts",
					strings: config.strings,
					path: mainPipeline.path,
					pageData: { template: "en/docpage", nav_parent: "api" },
					guidePages: getGuidePaths(mainPipeline),
					warnLinks: true,
				},
				(docs) => {
					mainApiDocs = docs;
				}
			);
		});

		// Add Web API docs and guides
		docPipeline.spawn("webcontext", "webcontext", (webContextPipeline) => {
			docgen.start(webContextPipeline, {
				parentDocs: mainApiDocs,
				dtsPath:
					"../../../../node_modules/@desk-framework/webcontext/dist/**/*.d.ts",
				strings: config.strings,
				path: webContextPipeline.path,
				pageData: { template: "en/docpage", nav_parent: "webcontext_api" },
				guidePages: getGuidePaths(webContextPipeline),
				warnLinks: true,
			});
		});

		// Add Test API docs and guides
		docPipeline.spawn("test", "test", (testPipeline) => {
			docgen.start(testPipeline, {
				parentDocs: mainApiDocs,
				dtsPath: "../../../../node_modules/@desk-framework/test/dist/**/*.d.ts",
				strings: config.strings,
				path: testPipeline.path,
				pageData: { template: "en/docpage", nav_parent: "test_api" },
				guidePages: getGuidePaths(testPipeline),
				warnLinks: true,
			});
		});

		// Add other content
		docPipeline.addFiles("index.md");
	});
}
