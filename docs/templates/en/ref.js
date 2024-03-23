import { template as docsTemplate } from "./docs.js";
export function template(html, data, builder) {
	data.title += " - Reference";
	return docsTemplate(html, data, builder);
}
