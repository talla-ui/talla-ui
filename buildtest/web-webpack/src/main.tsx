import { Activity, ui } from "talla";

const page = (
	<cell>
		<label>Hello, world!</label>
	</cell>
);

export class MainActivity extends Activity {
	createView() {
		return new page();
	}
}
