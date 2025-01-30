import { Activity, ui } from "talla-ui";

const page = (
	<cell>
		<label align="center">Hello, world!</label>
	</cell>
);

export class MainActivity extends Activity {
	createView() {
		return page.create();
	}
}
