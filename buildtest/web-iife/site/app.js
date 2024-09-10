(function () {
	const { ui, useWebContext } = talla;
	const globeIcon = ui.icon(
		`<svg width="24" height="24"><use href="/globe.svg#icon"></use></svg>`,
	);

	const page = ui.page(
		ui.cell(ui.label({ icon: globeIcon, text: "Hello, World!" })),
	);

	class MainActivity extends talla.Activity {
		createView() {
			return new page();
		}
	}

	useWebContext().addActivity(new MainActivity(), true);
})();
