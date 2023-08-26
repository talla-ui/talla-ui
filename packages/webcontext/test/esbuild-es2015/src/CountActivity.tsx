import {
	bound,
	JSX,
	ViewActivity,
} from "../../../lib/desk-framework-web.es2015.esm.min";
import NumberCount from "./NumberCount";

const ViewBody = (
	<cell>
		<NumberCount count={bound.number("count")} />
		<spacer height={32} />
		<centerrow>
			<outlinebutton onClick="CountDown">Down</outlinebutton>
			<outlinebutton onClick="CountUp">Up</outlinebutton>
		</centerrow>
	</cell>
);

export class CountActivity extends ViewActivity {
	static ViewBody = ViewBody;

	count = 0;

	onCountDown() {
		if (this.count > 0) this.count--;
	}

	onCountUp() {
		this.count++;
	}
}
