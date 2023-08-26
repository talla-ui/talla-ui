import { Pipeline } from "markdown-pipeline";

export function start(pipeline: Pipeline) {
	pipeline.addOutputTransform(async (item) => {
		await item.replaceOutputTagsAsync({
			iframesample(attr: { js: string; short?: boolean; tall?: boolean }) {
				return (
					`<iframe src="about:blank" data-samplejs="${attr.js}"` +
					(attr.short ? ' class="short"' : "") +
					(attr.tall ? ' class="tall"' : "") +
					"></iframe>"
				);
			},
		});
	});
}
