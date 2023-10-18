import {
	Activity,
	app,
} from "../../../../lib/desk-framework-web.es2015.esm.min";
import body from "./body";
import messages from "./messages";

export class CountActivity extends Activity {
	count = 0;

	protected ready() {
		this.view = new body();
	}

	onCountDown() {
		if (this.count > 0) this.count--;
		else app.showAlertDialogAsync(messages.negativeError);
	}

	onCountUp() {
		this.count++;
	}
}
