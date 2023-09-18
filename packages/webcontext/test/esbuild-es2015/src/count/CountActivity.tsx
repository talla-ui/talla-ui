import {
	app,
	ViewActivity,
} from "../../../../lib/desk-framework-web.es2015.esm.min";
import body from "./body";
import messages from "./messages";

export class CountActivity extends ViewActivity {
	static ViewBody = body;

	count = 0;

	onCountDown() {
		if (this.count > 0) this.count--;
		else app.showAlertDialogAsync(messages.negativeError);
	}

	onCountUp() {
		this.count++;
	}
}
