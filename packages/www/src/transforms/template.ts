import { Pipeline } from "markdown-pipeline";

const loadTemplates = new Map<string, Promise<string>>();

export function start(pipeline: Pipeline) {
	pipeline.addOutputTransform(async (item) => {
		if (!item.output) return;
		let template = item.data.template || "";
		if (/^[\w\/]+$/.test(template) && template !== "none") {
			let content = item.output.text || "";

			let text: string;
			if (loadTemplates.has(template)) {
				// use loaded template text
				text = await loadTemplates.get(template)!;
			} else {
				// include template MD file to require assets
				pipeline.addFiles("templates/" + template + "/assets.md");

				// load template text
				let promise = pipeline.readTextFileAsync(
					"templates/" + template + "/template.html",
				);
				loadTemplates.set(template, promise);
				text = await promise;
			}

			// set output to template content and replace tags
			item.output = { path: item.output.path, text };
			await item.replaceOutputTagsAsync({
				"template-content": () => content,
			});

			// sanity check
			let parts = item.output.text.split(/\<(?:body|\/body|html|\/html)\W/);
			if (parts.length != 5) {
				throw Error("HTML sanity check failed on " + item.path);
			}
		}
	});
}
