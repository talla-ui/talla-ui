import { Activity, ui } from "talla-ui";
import globeSvg from "./icons/globe.svg?raw";

const page = (
	<cell>
		<image icon={ui.icon("globe", globeSvg)} />
		<label align="center">Hello, world!</label>
	</cell>
);

export class MainActivity extends Activity {
	createView() {
		return page.create();
	}
}
