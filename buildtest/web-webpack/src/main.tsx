import { Activity, ui } from "talla-ui";

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
