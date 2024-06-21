import { Activity, ui } from "@desk-framework/frame-core";
import globeSvg from "./icons/globe.svg?raw";

const page = (
	<mount page>
		<cell>
			<label icon={ui.icon(globeSvg)}>Hello, world!</label>
		</cell>
	</mount>
);

export class MainActivity extends Activity {
	createView() {
		return new page();
	}
}
