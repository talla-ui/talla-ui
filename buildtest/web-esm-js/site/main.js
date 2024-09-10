import { Activity, ui } from "./lib/talla-web.es2015.esm.min.js";

const page = ui.page(ui.cell(ui.label("Hello, world!")));

export class MainActivity extends Activity {
	createView() {
		return new page();
	}
}
