import globeSvg from "bundle-text:./icons/globe.svg";
import { Activity, UI, UIIconResource } from "talla-ui";

export class MainActivity extends Activity {
	static override View() {
		return UI.Cell(
			UI.Label("Hello, world!").icon(new UIIconResource(globeSvg)).center(),
		);
	}
}
