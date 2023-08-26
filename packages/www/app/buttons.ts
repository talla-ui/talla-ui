function showSearch() {
	document.body.className = "docpage show_search";

	// use querySelector and focus instead of using requestFocus
	// because otherwise this doesn't work on mobile
	let input = document.querySelector(
		"#docpage-searchbar input"
	) as HTMLInputElement;
	input.value = "";
	input.focus();
}

export function enableButtons() {
	// Show and hide search sidebar:
	document.getElementById("breadcrumb-searchbutton")!.onclick = showSearch;
	document.getElementById("navbar-searchbutton")!.onclick = showSearch;

	// Use keyboard shortcut to do the same:
	window.addEventListener("keypress", (e) => {
		if (
			e.key === "/" &&
			(!document.activeElement || document.activeElement === document.body)
		) {
			e.preventDefault();
			showSearch();
		}
	});

	// Show and hide navbar:
	document.getElementById("breadcrumb-menubutton")!.onclick = function () {
		document.body.className = "docpage show_navbar";
	};
	document.getElementById("navbar-closebutton")!.onclick = function () {
		document.body.className = "docpage";
	};
	document.getElementById("docpage-navbar")!.onclick = function (e) {
		if ((e.target as HTMLAnchorElement).nodeName === "A") {
			document.body.className = "docpage";
		}
	};
}
