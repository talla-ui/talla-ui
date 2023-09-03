import { Pipeline } from "markdown-pipeline";
import { IndexEntryType } from "../docgen/Indexer";

const TYPES: { [type in IndexEntryType]?: string } = {
	namespace: "class",
	class: "class",
	interface: "type",
	type: "type",
	method: "function",
	function: "function",
	property: "var",
	variable: "var",
};

export function start(pipeline: Pipeline) {
	pipeline.addOutputResolveTransform(async (item) => {
		await item.replaceOutputTagsAsync({
			async pagerefblock(attr: { path: string }) {
				let page = pipeline.find(attr.path);
				if (!page || (!page.output && !page.data.output)) {
					if (!item.data.warnings) item.data.warnings = [];
					item.data.warnings.push(
						"Page ref not found: " +
							item.path +
							" => " +
							attr.path +
							(page ? " (no output information)" : ""),
					);
					return "???";
				}
				let title: string = page.data.subject || page.data.title;
				if (!title) {
					if (!item.data.warnings) item.data.warnings = [];
					item.data.warnings.push(
						"Page ref has no title: " + item.path + " => " + attr.path,
					);
					title = "???";
				}
				let abstract = await pipeline.parseAsync(page.data.abstract || "");
				if (abstract && !/[.!?]$/.test(abstract)) abstract += ".";
				let url =
					page.output?.path ||
					page.pipeline.outputPath + "/" + page.data.output;
				let doctags = Object.keys(page.data.doctags || {}).filter(
					(id) => page?.data.doctags[id],
				);
				let type = (TYPES as any)[page.data.type] || "doc";
				return (
					`<div class="pagerefblock pagerefblock--${type}">` +
					`<a href="/${pipeline.escapeHtml(
						encodeURI(url),
					)}">${pipeline.escapeHtml(title)}</a> ` +
					doctags
						.map((id) => `<span class="doctag doctag--${id}">${id}</span>`)
						.join("") +
					`<span class="pagerefblock_abstract">${abstract}</span>` +
					"</div>"
				);
			},
		});
	});
}
