import { Activity, ui } from "../lib/talla-web.es2015.esm.min.js";

const page = (
	<cell>
		<label>Hello, world!</label>
	</cell>
);

export class MainActivity extends Activity {
	createView() {
		return page.create();
	}
}
