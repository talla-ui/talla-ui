import { Activity, ui } from "talla-ui";
import globeSvg from "./icons/globe.svg";

const page = (
	<cell>
		<label icon={ui.icon(globeSvg)}>Hello, world!</label>
	</cell>
);

export class MainActivity extends Activity {
	createView() {
		return new page();
	}
}
