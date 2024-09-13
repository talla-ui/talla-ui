import { Activity, ui } from "talla";
import globeSvg from "bundle-text:./icons/globe.svg";

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
