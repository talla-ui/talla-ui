import { Activity, UI } from "talla-ui";

export class MainActivity extends Activity {
	static override View() {
		return UI.Cell(UI.Text("Hello, world!").center());
	}
}
