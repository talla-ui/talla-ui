import { encode } from "html-entities";
const TIME = String(Date.now());
const BREADTYPE = {
	namespace: "namespace",
	class: "class",
	interface: "interface",
	type: "type",
	constructor: "constructor",
	method: "method",
	function: "function",
	property: "property",
	variable: "variable",
};
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
		.replace(/<[^>]+>\s*<a[^>]+><!--{ref:.*/gm, (s) => {
			throw Error("Invalid refblock: " + s);
		})
		.replace(
			/<!--\{refchip:(\w+)\}-->/g,
			'<span class="refchip refchip--$1">$1</span>',
		);
const menuItem = (it) => `
	<li
		class="menu-item menu-item--${it.type}${it.current ? " menu-item--current" : ""}"
		${it.current ? 'id="current-menu-item"' : ""}
	>
		<icon class="icon icon--${ICONS[it.type] || "doc"}"></icon>
		<a href="${it.href}">${encode(it.title)}</a>
	</li>
	${it.menu ? menuList(it.menu) : ""}
`;
const menuList = (items, root) => `
	<ul class="menu${root ? " menu--root" : ""}">
		${items.map(menuItem).join("\n")}
	</ul>
`;
const breadcrumb = (data) =>
	(data.parentLink
		? `<a href="${data.parentLink}">${data.parentTitle}</a>`
		: "") +
	(BREADTYPE[data.type]
		? ` <icon class="icon icon--breadcrumb"></icon> ${BREADTYPE[data.type]}`
		: "");

export default async (html, data) => `
<!DOCTYPE html>
<html lang="${data.lang || "en"}">
	<head>
		<meta charset="UTF-8" />
		<meta http-equiv="X-UA-Compatible" content="IE=edge" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<link rel="stylesheet" href="/style.css?t=${TIME}" />
		<link rel="stylesheet" href="/menu.css?t=${TIME}" />
		<link rel="stylesheet" href="/diagram.css?t=${TIME}" />
		<title>Tälla UI framework - ${data.title || data.id || ""}</title>
		<meta name="description" content="${encode(data.metaDescription) || ""}" />
	</head>
	<body class="docpage">
		<div class="docpage_header">
			<a href="/" class="logo"></a>
			<div class="header_links">
				<a href="/docs/en/introduction.html" class="hide_narrow">About</a>
				<a href="/docs/en/"><b>Docs</b></a>
				<a href="/docs/en/blog/blog.html">Blog</a>
				<a href="https://github.com/talla-ui/talla-ui" target="_blank">
					<icon class="icon icon--github"></icon>
				</a>
			</div>
		</div>
		<div class="docpage_wrapper">
			<div class="docpage_searchbar">
				<div class="docpage_searchcontainer" id="docpage-search"></div>
				<div class="docpage_navbar_footer">
					<a href="#" id="search-back-to-top">
						<span class="icon icon--arrow_up"></span>
						Back to top
					</a>
				</div>
			</div>
			<div class="docpage_navbar" id="docpage-navbar">
				<div class="docpage_navbar_header">
					<a href="/docs/en/">Docs</a>
					<button id="navbar-searchbutton" class="navbar_searchbutton" aria-label="search"></button>
					<button id="navbar-closebutton" class="navbar_closebutton" aria-label="close"></button>
				</div>
				<div class="docpage_navbar_pane">
					${data.menu ? menuList(data.menu, true) : ""}
				</div>
				<div class="docpage_navbar_footer">
					<a href="#" id="back-to-top">
						<span class="icon icon--arrow_up"></span>
						Back to top
					</a>
				</div>
			</div>
			<div class="docpage_content">
				<article class="docpage">
					<div class="docpage_breadcrumb">
						<button id="breadcrumb-menubutton" class="docpage_breadcrumb_menubutton" aria-label="menu"></button>
						<span>${breadcrumb(data)}</span>
						<button id="breadcrumb-searchbutton" class="docpage_breadcrumb_searchbutton" aria-label="search"></button>
					</div>
					${replaceTags(html)}
				</article>
			</div>
		</div>
		<script src="/script.js?t=${TIME}"></script>
		<script src="/icons.js?t=${TIME}"></script>
		<script src=\"/lib/talla-web.es2015.iife.min.js\"></script>
		<script src="/bundle.js?t=${TIME}"></script>
	</body>
</html>
`;
