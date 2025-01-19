import { encode } from "html-entities";
const TIME = String(Date.now());
const ICONS = {
	namespace: "class",
	class: "class",
	interface: "type",
	type: "type",
	constructor: "constructor",
	method: "function",
	function: "function",
	property: "var",
	variable: "var",
	heading: "heading",
	listdoc: "list",
};
const replaceTags = (html) =>
	html
		.replace(
			/<li>(\s*<a[^>]+>)<!--{ref:(\w+)}-->/g,
			(_, tag, type) =>
				`<li class="refblock">` +
				`<icon class="icon icon--${ICONS[type] || "doc"}"></icon>` +
				tag,
		)
		.replace(
			/<!--\{refchip:(\w+)\}-->/g,
			'<span class="refchip refchip--$1">$1</span>',
		);
export default async (html, data) => `
<!DOCTYPE html>
<html lang="${data.lang || ""}">
	<head>
		<meta charset="UTF-8" />
		<meta http-equiv="X-UA-Compatible" content="IE=edge" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<link rel="stylesheet" href="/style.css?t=${TIME}" />
		<link rel="stylesheet" href="/menu.css?t=${TIME}" />
		<link rel="stylesheet" href="/diagram.css?t=${TIME}" />
		<title>Tälla UI framework blog — ${data.title || data.id || ""}</title>
		<meta name="description" content="${encode(data.metaDescription) || ""}" />
	</head>
	<body class="docpage">
		<div class="docpage_header">
			<a href="/" class="logo"></a>
			<div class="header_links">
				<a href="/docs/en/introduction.html" class="hide_narrow">About</a>
				<a href="/docs/en/">Docs</a>
				<a href="/docs/en/blog/blog.html"><b>Blog</b></a>
				<a href="https://github.com/talla-ui/talla-ui" target="_blank">
					<icon class="icon icon--github"></icon>
				</a>
			</div>
		</div>
		<div class="blogpage_wrapper">
			<article class="blogpage">
				${replaceTags(html)}
			</article>
		</div>
		<script src="/script.js?t=${TIME}"></script>
		<script src="/icons.js?t=${TIME}"></script>
		<script src=\"/lib/talla-web.es2015.iife.min.js\"></script>
		<script src="/bundle.js?t=${TIME}"></script>
	</body>
</html>
`;
