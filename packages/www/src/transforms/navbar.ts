import { Pipeline } from "markdown-pipeline";

export type NavPage = {
	id: string;
	title: string;
	path: string;
};

export type NavCategory = {
	title: string;
	pages: NavPage[];
};

export type NavStructure = {
	title: string;
	root: string;
	categories: NavCategory[];
};

export function start(pipeline: Pipeline, nav: NavStructure) {
	pipeline.addResolveTransform(async (item) => {
		let toc = "";
		for (let line of item.source) {
			let match = line.match(/^\#+[ \t]+(.*)\{\#(.*)\}/);
			if (match) {
				toc +=
					`<li><a href="#${match[2]}">` +
					pipeline.escapeHtml(match[1]!.trim()) +
					"</a></li>\n";
			}
		}

		let result =
			`<a href="${nav.root}" class="navbar_title">` +
			pipeline.escapeHtml(nav.title) +
			"</a>" +
			'<button id="navbar-searchbutton" class="navbar_searchbutton">search</button>' +
			'<button id="navbar-closebutton" class="navbar_closebutton">close</button>' +
			'<ul class="navbar_list">\n';

		if (item.data.nav_parent) {
			// navigation bar mode: compact
			for (let category of nav.categories) {
				for (let page of category.pages) {
					if (item.data.nav_parent === page.id) {
						result +=
							'<li class="category"><span>' +
							pipeline.escapeHtml(category.title) +
							"</span>\n<ul><li>" +
							`<a href="${page.path}" class="nav_uplink">` +
							pipeline.escapeHtml(page.title) +
							"</a></li>\n" +
							(item.data.nav_uplink
								? '<li class="nav_uplink">' + item.data.nav_uplink + "</li>\n"
								: "") +
							'<li class="current"><a href="#">' +
							pipeline.escapeHtml(
								item.data.nav_title || item.data.title || "",
							) +
							"</a>" +
							(toc ? '<ul class="navbar_toclist">' + toc + "</ul>" : "") +
							"</li>\n</ul></li>\n";
					}
				}
			}
		} else {
			// navigation bar mode: root
			for (let category of nav.categories) {
				let pagelist = "";
				for (let page of category.pages) {
					let isCurrentPage = item.data.nav_id === page.id;
					pagelist +=
						`<li class="${isCurrentPage ? "current" : ""}">` +
						`<a href="${page.path + (isCurrentPage ? "#" : "")}">` +
						pipeline.escapeHtml(page.title) +
						"</a>" +
						(isCurrentPage && toc
							? '<ul class="navbar_toclist">' + toc + "</ul>"
							: "") +
						"</li>\n";
				}
				result +=
					`<li class="category"><span>` +
					pipeline.escapeHtml(category.title) +
					"</span><ul>" +
					pagelist +
					"</ul></li>\n";
			}
		}
		result += "</ul>\n";
		item.data.navbar_html = result;
	});
}
