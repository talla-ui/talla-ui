import { Activity, UI } from "../lib/talla-web.es2015.esm.min.js";

function Page() {
	return UI.Cell(UI.Label("Hello, world!").center());
}

export class MainActivity extends Activity {
	protected override viewBuilder() {
		return Page();
	}
}
