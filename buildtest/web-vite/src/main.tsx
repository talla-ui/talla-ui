import { Activity, ui } from "talla-ui";
import globeSvg from "./icons/globe.svg?raw";

const page = (
	<cell>
		<label icon={ui.icon(globeSvg)}>Hello, world!</label>
	</cell>
);

export class MainActivity extends Activity {
	createView() {
		return page.create();
	}
}
