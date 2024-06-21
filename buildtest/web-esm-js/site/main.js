import { Activity, ui } from "./lib/desk-framework-web.es2015.esm.min.js";

const page = ui.page(ui.cell(ui.label("Hello, world!")));

export class MainActivity extends Activity {
	createView() {
		return new page();
	}
}
