(function () {
	const { ui, useWebContext } = desk;

	const page = ui.page(ui.cell(ui.label("Hello, World!")));

	class MainActivity extends desk.Activity {
		createView() {
			return new page();
		}
	}

	useWebContext().addActivity(new MainActivity(), true);
})();
