import { Activity, ui } from "../lib/talla-web.es2015.esm.min.js";

const page = (
	<mount page>
		<cell>
			<label>Hello, world!</label>
		</cell>
	</mount>
);

export class MainActivity extends Activity {
	createView() {
		return new page();
	}
}
