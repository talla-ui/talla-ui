(function init_docspage() {
	window.init_docspage = init_docspage;

	// scroll current menu item into view
	function scrollMenuItem() {
		let currentMenuItem = document.getElementById("current-menu-item");
		if (currentMenuItem && currentMenuItem.offsetParent) {
			currentMenuItem.offsetParent.scrollTop = currentMenuItem.offsetTop - 40;
		}
	}
	scrollMenuItem();

	// helper function to set click event handler
	function handle(id, f) {
		let element = document.getElementById(id);
		if (element) element.onclick = f;
	}

	// scroll to top using script
	handle("back-to-top", backToTop);
	handle("search-back-to-top", backToTop);
	function backToTop() {
		window.scrollTo(0, 0);
		scrollMenuItem();
		return false;
	}

	// show and hide navbar
	handle("breadcrumb-menubutton", () => {
		document.body.className = "docpage show_navbar";
		setTimeout(scrollMenuItem, 100);
	});
	handle("navbar-closebutton", () => {
		document.body.className = "docpage";
	});
	handle("docpage-navbar", (e) => {
		if (e.target.nodeName === "A") {
			document.body.className = "docpage";
		}
	});

	// show and hide search (app)
	function showSearch() {
		document.body.className = "docpage show_search";
		let input = document.querySelector("#docpage-search input");
		input.value = "";
		input.focus();
	}
	handle("breadcrumb-searchbutton", showSearch);
	handle("navbar-searchbutton", showSearch);

	// use keyboard shortcut to do the same
	window.addEventListener("keydown", (e) => {
		if (
			e.key === "/" &&
			(!document.activeElement || document.activeElement === document.body)
		) {
			e.preventDefault();
			showSearch();
		}
	});
})();
