import { Activity, ui } from "talla";
import globeSvg from "bundle-text:./icons/globe.svg";

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
