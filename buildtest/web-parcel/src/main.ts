import globeSvg from "bundle-text:./icons/globe.svg";
import { Activity, UI, UIIconResource } from "talla-ui";

function Page() {
	return UI.Cell(
		UI.Label("Hello, world!").icon(new UIIconResource(globeSvg)).center(),
	);
}

export class MainActivity extends Activity {
	protected defineView() {
		return Page();
	}
}
