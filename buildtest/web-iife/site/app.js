(function () {
	const { ui, useWebContext } = tallaUI;
	const globeIcon = ui.icon(
		`<svg width="24" height="24"><use href="/globe.svg#icon"></use></svg>`,
	);

	const page = ui.cell(ui.label("Hello, world!", { icon: globeIcon }));

	class MainActivity extends tallaUI.Activity {
		createView() {
			return page.create();
		}
	}

	useWebContext().addActivity(new MainActivity(), true);
})();
