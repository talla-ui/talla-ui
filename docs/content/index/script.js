(function docs_initPage() {
	window.docs_initPage = docs_initPage;

	// scroll current menu item into view
	function scrollMenuItem() {
		let currentMenuItem = document.getElementById("current-menu-item");
		if (currentMenuItem && currentMenuItem.offsetParent) {
			currentMenuItem.offsetParent.scrollTop = currentMenuItem.offsetTop - 40;
		}
	}
	scrollMenuItem();

	// scroll to top using script
	document.getElementById("back-to-top").onclick = function () {
		window.scrollTo(0, 0);
		scrollMenuItem();
		return false;
	};

	// show and hide navbar
	document.getElementById("breadcrumb-menubutton").onclick = function () {
		document.body.className = "docpage show_navbar";
		setTimeout(scrollMenuItem, 100);
	};
	document.getElementById("navbar-closebutton").onclick = function () {
		document.body.className = "docpage";
	};
	document.getElementById("docpage-navbar").onclick = function (e) {
		if (e.target.nodeName === "A") {
			document.body.className = "docpage";
		}
	};

	// show and hide search (app)
	function showSearch() {
		document.body.className = "docpage show_search";
		let input = document.querySelector("#docpage-search input");
		input.value = "";
		input.focus();
	}
	document.getElementById("breadcrumb-searchbutton").onclick = showSearch;
	document.getElementById("navbar-searchbutton").onclick = showSearch;

	// use keyboard shortcut to do the same
	window.addEventListener("keypress", (e) => {
		if (
			e.key === "/" &&
			(!document.activeElement || document.activeElement === document.body)
		) {
			e.preventDefault();
			showSearch();
		}
	});
})();
