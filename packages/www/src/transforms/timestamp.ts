import { Pipeline } from "markdown-pipeline";

let _timestamp = Date.now().toString();

export function start(pipeline: Pipeline) {
	pipeline.addOutputTransform(async (item) => {
		await item.replaceOutputTagsAsync({
			timestamp: () => _timestamp,
		});
	});
}
