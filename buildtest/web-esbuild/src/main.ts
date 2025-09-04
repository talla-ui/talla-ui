import { Activity, UI, UIIconResource } from "talla-ui";
import globeSvg from "./icons/globe.svg";

export class MainActivity extends Activity {
	static override View() {
		return UI.Cell(
			UI.Label("Hello, world!").icon(new UIIconResource(globeSvg)).center(),
		);
	}
}
