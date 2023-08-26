import { Pipeline } from "markdown-pipeline";

export function start(pipeline: Pipeline) {
	pipeline.addResolveTransform(async (item) => {
		await item.replaceSourceTagsAsync({
			breadcrumb(attr: { uplink?: string; name?: string }) {
				return (
					"<!--{{html-attr class=docpage_breadcrumb}}-->\n" +
					(attr.uplink || item.data.nav_uplink || "") +
					(attr.name ? ` **${attr.name}** ` : "&nbsp;") +
					"<button id=breadcrumb-menubutton class=docpage_breadcrumb_menubutton>menu</button>" +
					"<button id=breadcrumb-searchbutton class=docpage_breadcrumb_searchbutton>search</button>"
				);
			},
		});
	});
}
