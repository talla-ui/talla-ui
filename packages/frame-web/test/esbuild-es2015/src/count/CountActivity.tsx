import {
	Activity,
	app,
} from "../../../../lib/desk-framework-web.es2015.esm.min";
import body from "./body";
import text from "../text";

export class CountActivity extends Activity {
	count = 0;

	protected ready() {
		this.view = new body();
	}

	onCountDown() {
		if (this.count > 0) this.count--;
		else app.showAlertDialogAsync(text.negativeError);
	}

	onCountUp() {
		this.count++;
	}
}
