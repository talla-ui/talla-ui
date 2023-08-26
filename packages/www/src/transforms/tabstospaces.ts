import { Pipeline } from "markdown-pipeline";

export function start(pipeline: Pipeline) {
	pipeline.addSourceTransform(async (item) => {
		for (let i = 0; i < item.source.length; i++) {
			item.source[i] = item.source[i]!.replace(/\t/g, "  ");
		}
	});
}
