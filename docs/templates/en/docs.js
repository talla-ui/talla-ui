import { encode } from "html-entities";
export const template = async (html, data, builder) => `
<!DOCTYPE html>
<html lang="${data.lang || ""}">
	<head>
		<meta charset="UTF-8" />
		<meta http-equiv="X-UA-Compatible" content="IE=edge" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<link
			href="https://fonts.googleapis.com/css?family=Material+Icons+Outlined&display=block"
			rel="stylesheet"
		/>
		<link
			href="https://fonts.googleapis.com/css?family=IBM+Plex+Mono:300,500,400i|IBM+Plex+Sans:300,500,800,300i,500i&display=swap"
			rel="stylesheet"
		/>
		<link rel="stylesheet" href="/style.css?t=${Date.now()}" />
		<title>Desk framework - ${data.title || data.id || ""}</title>
		<meta name="description" content="${encode(data.abstract) || ""}" />
	</head>
	<body class="docpage">
		<div class="docpage_header">
			<a href="/">
				<img
					src="/logo.png"
					class="docpage_header_logo"
					alt="Desk logo"
				/>
			</a>
			<div class="header_links">
				<a href="/docs/en/introduction.html">About</a>
				<a href="/docs/en/">Docs</a>
				<a href="https://github.com/desk-framework/desk" target="_blank">
					<img src="/github-mark-white.svg" alt="GitHub" />
				</a>
			</div>
		</div>
		<div class="docpage_wrapper">
			<div class="docpage_searchbar">
				<div id="docpage-search"></div>
				<div class="docpage_navbar_footer">
					<i class="material-icons-outlined">arrow_upward</i>
					<a href="#" id="back-to-top">Back to top</a>
				</div>
			</div>
			<div class="docpage_navbar" id="docpage-navbar">
				<div class="docpage_navbar_header">
					<a href="/docs/en/">Docs (${builder.getTagText("VERSION")})</a>
					<button id="navbar-searchbutton" class="navbar_searchbutton">search</button>
					<button id="navbar-closebutton" class="navbar_closebutton">close</button>
				</div>
				<div class="docpage_navbar_pane">
					${data.menu_html || ""}
				</div>
				<div class="docpage_navbar_footer">
					<i class="material-icons-outlined">arrow_upward</i>
					<a href="#" id="back-to-top">Back to top</a>
				</div>
			</div>
			<div class="docpage_content">
				<article class="docpage">
					<div class="docpage_breadcrumb">
						<button id="breadcrumb-menubutton" class="docpage_breadcrumb_menubutton">menu</button>
						<span>${data.breadcrumb_html || ""}</span>
						<button id="breadcrumb-searchbutton" class="docpage_breadcrumb_searchbutton">search</button>
					</div>
					${html}
				</article>
			</div>
		</div>
		<script src="/script.js"></script>
		<script src=\"/lib/desk-framework-web.es2018.iife.min.js\"></script>
		<script src="/bundle.js"></script>
	</body>
</html>
`;
