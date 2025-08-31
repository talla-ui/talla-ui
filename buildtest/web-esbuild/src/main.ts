import { Activity, UI, UIIconResource } from "talla-ui";
import globeSvg from "./icons/globe.svg";

function Page() {
	return UI.Cell(
		UI.Label("Hello, world!").icon(new UIIconResource(globeSvg)).center(),
	);
}

export class MainActivity extends Activity {
	protected viewBuilder() {
		return Page();
	}
}
