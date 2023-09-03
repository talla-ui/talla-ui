import type { Pipeline } from "markdown-pipeline";
import { DocGenOptions } from "./DocGenOptions.js";
import { PackageDocs } from "./PackageDocs.js";

/**
 * Main pipeline function for generated reference documentation
 *
 * This function is called with a set of .d.ts files for each language/version
 * and adds all API reference pages.
 * It also replaces a <!--{{docgentoc}}--> tag to add a TOC to any file in
 * the given pipeline.
 *
 * In general, generation works like this:
 * docgen/pipeline =>
 * 	PackageDocs (wrapper for a set of .d.ts files) =>
 * 		.addEntryPagesAsync()
 *      Tokenizer (tokenizes 1 file)
 *      Parser (parses 1 file)
 *      Indexer (indexes 1 file)
 *      ... merge indexes ...
 * 		  PageBuilder (builds 1 API page)
 * 		.addTOCAsync()
 *			PageBuilder (builds TOC partial)
 *		.addGuidePagesAsync()
 *			PageBuilder (builds 1 page)
 * 		.addJSONAsync()
 */
export function start(
	pipeline: Pipeline,
	options: DocGenOptions,
	callback?: (packageDocs: PackageDocs) => void,
) {
	// use a spawned pipeline for generated content, and add all pages
	let docgenPipeline = pipeline.spawn("", "", async () => {
		await docs.addEntryPagesAsync();
		await docs.addTOCAsync();
		await docs.addJSONAsync();
		await docs.addGuidePagesAsync();
	});
	let docs: PackageDocs = new PackageDocs(docgenPipeline, options);
	callback?.(docs);

	// add docgentoc tag replacement to insert TOC
	docgenPipeline.addResolveTransform(async (item) => {
		await item.replaceSourceTagsAsync({
			docgentoc: () =>
				pipeline.find(pipeline.path + "/_toc")!.source.join("\n"),
		});
	});

	// add guidebacklinks tag replacement to include a backlinks section
	docgenPipeline.addSourceTransform(async (item) => {
		await item.replaceSourceTagsAsync({
			guidebacklinks: async () => {
				return docs.getGuideContentAsync(item);
			},
		});
	});

	// add transform to main docs pipeline, to wait for generated content
	pipeline.addResolveTransform(async () => {
		await docs.getIndexAsync();
	});
}
