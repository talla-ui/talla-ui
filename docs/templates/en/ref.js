import docsTemplate from "./docs.js";
export default function (html, data) {
	data.title += " - Reference";
	return docsTemplate(html, data);
}
