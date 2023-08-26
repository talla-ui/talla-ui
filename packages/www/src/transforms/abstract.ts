import { Pipeline } from "markdown-pipeline";

export function start(pipeline: Pipeline) {
	pipeline.addResolveTransform(async (item) => {
		await item.replaceSourceTagsAsync({
			abstract() {
				let text = item.data.abstract || "???";
				if (!/[.!?]$/.test(text)) text += ".";
				return "<!--{{html-attr class=style--pageintro}}-->\n" + text + "\n";
			},
		});
	});
}
