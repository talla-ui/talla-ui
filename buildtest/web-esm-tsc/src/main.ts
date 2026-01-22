import { Activity, UI } from "../lib/talla-web.es2015.esm.min.js";

export class MainActivity extends Activity {
	static override View() {
		return UI.Column(UI.Text("Hello, world!").center());
	}
}
