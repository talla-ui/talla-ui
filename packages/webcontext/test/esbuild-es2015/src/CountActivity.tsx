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
		<row align="center">
			<button onClick="CountDown">Down</button>
			<button onClick="CountUp">Up</button>
		</row>
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
