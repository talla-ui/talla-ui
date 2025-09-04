import { Activity, UI } from "./lib/talla-web.es2015.esm.min.js";

export class MainActivity extends Activity {
	static View() {
		return UI.Cell(UI.Label("Hello, world!").center());
	}
}
