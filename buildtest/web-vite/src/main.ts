import { Activity, UI, UIIconResource } from "talla-ui";
import globeSvg from "./icons/globe.svg?raw";

export class MainActivity extends Activity {
	static override View() {
		return UI.Column(
			UI.Text("Hello, world!").icon(new UIIconResource(globeSvg)).center(),
		)
			.flex()
			.centerContent();
	}
}
