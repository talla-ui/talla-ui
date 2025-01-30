(function () {
	const { ui, useWebContext } = tallaUI;
	const globeIcon = ui.icon(
		"globe",
		`<svg width="24" height="24" viewBox="0 0 24 24" id="icon" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m0-2q3.35 0 5.675-2.325T20 12q0-.175-.012-.363t-.013-.312q-.125.725-.675 1.2T18 13h-2q-.825 0-1.412-.587T14 11v-1h-4V8q0-.825.588-1.412T12 6h1q0-.575.313-1.012t.762-.713q-.5-.125-1.012-.2T12 4Q8.65 4 6.325 6.325T4 12h5q1.65 0 2.825 1.175T13 16v1h-3v2.75q.5.125.988.188T12 20"/></svg>`,
	);

	const page = ui.cell(
		ui.label("Hello, world!", { icon: globeIcon, align: "center" }),
	);

	class MainActivity extends tallaUI.Activity {
		createView() {
			return page.create();
		}
	}

	useWebContext().addActivity(new MainActivity(), true);
})();
