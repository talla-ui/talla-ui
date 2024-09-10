import { Activity, ui } from "talla";

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
