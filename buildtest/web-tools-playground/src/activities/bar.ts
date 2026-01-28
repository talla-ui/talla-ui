import { Activity, app } from "talla-ui";
import { BarView } from "./bar.view";

export class BarActivity extends Activity {
	static View = BarView;

	title = "Bar";
	navigationPath = "bar";

	count = 0;

	protected onIncrementCount() {
		this.count++;
	}

	protected onDecrementCount() {
		if (!this.count) {
			app.log.error("Counter cannot be negative");
			return;
		}
		this.count--;
	}
}
